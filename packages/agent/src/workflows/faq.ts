import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@tee-time/database";
import { retrieveFaqCandidates } from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { createFaqAgent, type AgentMessage } from "../agent";

export type FaqFlowInput = {
  message: string;
  memberId?: string;
  locale?: string;
  db?: Database;
  /** Conversation history for multi-turn context */
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export type FaqFlowDecision =
  | {
      type: "answer";
      answer: string;
      confidence?: number;
    }
  | {
      type: "clarify";
      prompt: string;
    }
  | {
      type: "escalate";
      reason: string;
    };

const DEFAULT_CLARIFY_PROMPT =
  "I can help with tee times, membership, or club info. What would you like to know?";

export type FaqFlowRuntime = {
  getFaqAnswer?: (question: string) => Promise<{
    answer: string;
    confidence: number;
  } | null>;
  getFaqCandidates?: (question: string) => Promise<Array<{
    question: string;
    answer: string;
    confidence: number;
  }>>;
};

/**
 * Runs the FAQ flow using the multi-step agent pattern for free-form conversations.
 * Falls back to the simpler retrieval pattern if no database is available.
 */
export const runFaqFlow = async (
  input: FaqFlowInput,
  runtime: FaqFlowRuntime = {}
): Promise<FaqFlowDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return { type: "clarify", prompt: DEFAULT_CLARIFY_PROMPT };
  }

  const getCandidates =
    runtime.getFaqCandidates ??
    (input.db
      ? async (question: string) =>
          (await retrieveFaqCandidates(input.db as Database, question, { limit: 3 })) ?? []
      : undefined);

  if (getCandidates) {
    try {
      const candidates = await getCandidates(message);
      if (candidates.length > 0) {
        const sorted = [...candidates].sort(
          (a, b) => b.confidence - a.confidence
        );
        if (
          sorted.length === 1 ||
          sorted[0].confidence - sorted[1].confidence >= 0.08
        ) {
          return {
            type: "answer",
            answer: sorted[0].answer,
            confidence: sorted[0].confidence,
          };
        }

        const openrouter = getOpenRouterClient();
        const modelId = resolveModelId();
        const SelectionSchema = z.object({
          decision: z.enum(["pick", "no_match"]),
          index: z.number().int().min(1).max(10).nullable(),
          reason: z.string().nullable(),
        });
        const promptLines = sorted
          .map(
            (item, index) =>
              `${index + 1}. Q: ${item.question}\nA: ${item.answer}\nConfidence: ${item.confidence.toFixed(
                3
              )}`
          )
          .join("\n\n");
        const selection = await generateObject({
          model: openrouter.chat(modelId),
          schema: SelectionSchema,
          system:
            "Pick the best FAQ answer for the user question. " +
            "If none match, return decision no_match. " +
            "If you pick, return decision pick and the 1-based index.",
          prompt:
            `User question: "${message}"\n\nFAQ entries:\n${promptLines}`,
        });
        if (
          selection.object.decision === "pick" &&
          selection.object.index !== null
        ) {
          const index = selection.object.index - 1;
          if (sorted[index]) {
            return {
              type: "answer",
              answer: sorted[index].answer,
              confidence: sorted[index].confidence,
            };
          }
        }
      }
    } catch (error) {
      console.error("FAQ retrieval error:", error);
    }
  }

  // If we have a database, use the multi-step agent for richer interactions
  if (input.db) {
    try {
      const agent = createFaqAgent({ db: input.db });

      // Build messages array with conversation history
      const messages: AgentMessage[] = [
        ...(input.conversationHistory ?? []),
        { role: "user" as const, content: message },
      ];

      const result = await agent.generate({ messages });

      // Check if the agent called escalateToHuman tool
      const escalationStep = result.steps.find((step) =>
        step.toolCalls?.some(
          (tc: { toolName: string }) => tc.toolName === "escalateToHuman"
        )
      );

      if (escalationStep) {
        const escalationCall = escalationStep.toolCalls?.find(
          (tc: { toolName: string }) => tc.toolName === "escalateToHuman"
        );
        const reason =
          (escalationCall?.args as { reason?: string })?.reason ??
          "faq_escalation";
        return { type: "escalate", reason };
      }

      // Return the agent's text response
      if (result.text) {
        return {
          type: "answer",
          answer: result.text,
          confidence: 0.8, // Agent-generated responses have reasonable confidence
        };
      }

      return { type: "escalate", reason: "no_response" };
    } catch (error) {
      // Fall through to escalation on agent errors
      console.error("FAQ agent error:", error);
    }
  }

  return { type: "escalate", reason: "faq_low_confidence" };
};

/**
 * Runs a multi-turn FAQ conversation using the agent.
 * This is useful for complex questions that may require follow-up.
 */
export const runFaqConversation = async (
  input: FaqFlowInput & {
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  }
): Promise<FaqFlowDecision> => {
  if (!input.db) {
    return { type: "escalate", reason: "faq_unavailable" };
  }

  return runFaqFlow(input);
};
