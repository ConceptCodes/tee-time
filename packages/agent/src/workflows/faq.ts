import type { Database } from "@tee-time/database";
import { retrieveFaqAnswer } from "@tee-time/core";
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
      // Fall through to simpler retrieval on agent errors
      console.error("FAQ agent error:", error);
    }
  }

  // Fallback: Use direct FAQ retrieval
  const getAnswer =
    runtime.getFaqAnswer ??
    (input.db
      ? (question: string) => retrieveFaqAnswer(input.db as Database, question)
      : undefined);

  if (!getAnswer) {
    return { type: "escalate", reason: "faq_unavailable" };
  }

  const result = await getAnswer(message);
  if (!result || result.confidence < 0.6) {
    return { type: "escalate", reason: "faq_low_confidence" };
  }

  return {
    type: "answer",
    answer: result.answer,
    confidence: result.confidence,
  };
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
