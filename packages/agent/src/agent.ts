import { generateText, streamText, stepCountIs, type CoreMessage } from "ai";
import type { Database } from "@tee-time/database";
import { getOpenRouterClient, resolveModelId } from "./provider";
import { createAgentTools, type AgentTools } from "./tools";

export const DEFAULT_AGENT_INSTRUCTIONS = `You are the Tee time Booking agent, a helpful WhatsApp assistant for The Tee Time golf club members.

Your capabilities:
- Book new tee times by collecting club, date, time, and player information
- Check and update existing bookings
- Cancel bookings (with 24-hour cancellation policy)
- Answer frequently asked questions about membership, policies, hours, and pricing
- Escalate to human staff when you cannot help

Guidelines:
- Be concise and friendly in your responses
- Collect booking information one field at a time
- Always validate clubs against the approved whitelist
- Parse dates and times from natural language when possible
- Player count must be between 1 and 4
- If you're unsure about something, ask clarifying questions
- Escalate to human support if the user requests it or if you cannot help`;

export const FAQ_AGENT_INSTRUCTIONS = `You are a FAQ assistant for The Tee Time golf club. Your role is to answer common questions about:
- Membership and pricing
- Club policies and rules
- Operating hours and locations
- Booking procedures
- Guest policies

Use the searchFaqs tool to find answers. If you cannot find a good answer (confidence < 0.6) or the user needs help beyond FAQs, use the escalateToHuman tool.`;

export type AgentOptions = {
  model?: string;
  instructions?: string;
  db?: Database;
  maxSteps?: number;
};

export type AgentMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ToolCallInfo = {
  toolName: string;
  args: Record<string, unknown>;
};

export type ToolResultInfo = {
  toolName: string;
  result: unknown;
};

export type AgentStep = {
  text?: string;
  toolCalls?: ToolCallInfo[];
  toolResults?: ToolResultInfo[];
};

export type AgentResult = {
  text: string;
  steps: AgentStep[];
  finishReason: string;
};

/**
 * Converts AgentMessage[] to CoreMessage[] for the AI SDK.
 */
const toModelMessages = (messages: AgentMessage[]): CoreMessage[] => {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
};

/**
 * Creates the main booking agent configuration.
 * Returns a function that can be called with messages to generate responses.
 */
export const createBookingAgent = (options: AgentOptions = {}) => {
  const openrouter = getOpenRouterClient();
  const modelId = resolveModelId(options.model);
  const maxSteps = options.maxSteps ?? 10;
  const instructions = options.instructions ?? DEFAULT_AGENT_INSTRUCTIONS;

  const tools = options.db ? createAgentTools(options.db) : undefined;

  return {
    /**
     * Generate a response using multi-step tool calling.
     */
    generate: async (params: {
      prompt?: string;
      messages?: AgentMessage[];
    }): Promise<AgentResult> => {
      const result = await generateText({
        model: openrouter.chat(modelId),
        system: instructions,
        ...(params.prompt ? { prompt: params.prompt } : {}),
        ...(params.messages
          ? { messages: toModelMessages(params.messages) }
          : {}),
        tools,
        stopWhen: stepCountIs(maxSteps),
      });

      return {
        text: result.text,
        steps: result.steps.map((step) => ({
          text: step.text,
          toolCalls: step.toolCalls?.map((tc) => ({
            toolName: tc.toolName,
            args: "args" in tc ? (tc.args as Record<string, unknown>) : {},
          })),
          toolResults: step.toolResults?.map((tr) => ({
            toolName: tr.toolName,
            result: "result" in tr ? tr.result : undefined,
          })),
        })),
        finishReason: result.finishReason,
      };
    },

    /**
     * Stream a response using multi-step tool calling.
     */
    stream: async (params: {
      prompt?: string;
      messages?: AgentMessage[];
    }) => {
      return streamText({
        model: openrouter.chat(modelId),
        system: instructions,
        ...(params.prompt ? { prompt: params.prompt } : {}),
        ...(params.messages
          ? { messages: toModelMessages(params.messages) }
          : {}),
        tools,
        stopWhen: stepCountIs(maxSteps),
      });
    },

    /**
     * Get the tools available to this agent.
     */
    getTools: () => tools as AgentTools | undefined,
  };
};

/**
 * Creates a FAQ-specific agent optimized for answering questions.
 */
export const createFaqAgent = (options: AgentOptions = {}) => {
  if (!options.db) {
    throw new Error("Database connection required for FAQ agent");
  }

  const allTools = createAgentTools(options.db);
  const faqTools = {
    searchFaqs: allTools.searchFaqs,
    escalateToHuman: allTools.escalateToHuman,
  };

  const openrouter = getOpenRouterClient();
  const modelId = resolveModelId(options.model);
  const maxSteps = options.maxSteps ?? 5;
  const instructions = options.instructions ?? FAQ_AGENT_INSTRUCTIONS;

  return {
    generate: async (params: {
      prompt?: string;
      messages?: AgentMessage[];
    }): Promise<AgentResult> => {
      const result = await generateText({
        model: openrouter.chat(modelId),
        system: instructions,
        ...(params.prompt ? { prompt: params.prompt } : {}),
        ...(params.messages
          ? { messages: toModelMessages(params.messages) }
          : {}),
        tools: faqTools,
        stopWhen: stepCountIs(maxSteps),
      });

      return {
        text: result.text,
        steps: result.steps.map((step) => ({
          text: step.text,
          toolCalls: step.toolCalls?.map((tc) => ({
            toolName: tc.toolName,
            args: "args" in tc ? (tc.args as Record<string, unknown>) : {},
          })),
          toolResults: step.toolResults?.map((tr) => ({
            toolName: tr.toolName,
            result: "result" in tr ? tr.result : undefined,
          })),
        })),
        finishReason: result.finishReason,
      };
    },

    stream: async (params: {
      prompt?: string;
      messages?: AgentMessage[];
    }) => {
      return streamText({
        model: openrouter.chat(modelId),
        system: instructions,
        ...(params.prompt ? { prompt: params.prompt } : {}),
        ...(params.messages
          ? { messages: toModelMessages(params.messages) }
          : {}),
        tools: faqTools,
        stopWhen: stepCountIs(maxSteps),
      });
    },
  };
};

/**
 * Creates a support handoff agent for escalation scenarios.
 */
export const createSupportAgent = (options: AgentOptions = {}) => {
  const openrouter = getOpenRouterClient();
  const modelId = resolveModelId(options.model);
  const instructions = `You are a support handoff agent. Summarize the user's issue and prepare it for human staff.
    
Use the escalateToHuman tool to complete the handoff. Be empathetic and assure the user that staff will help them.`;

  const tools = options.db
    ? { escalateToHuman: createAgentTools(options.db).escalateToHuman }
    : undefined;

  return {
    generate: async (params: {
      prompt?: string;
      messages?: AgentMessage[];
    }): Promise<AgentResult> => {
      const result = await generateText({
        model: openrouter.chat(modelId),
        system: instructions,
        ...(params.prompt ? { prompt: params.prompt } : {}),
        ...(params.messages
          ? { messages: toModelMessages(params.messages) }
          : {}),
        tools,
        stopWhen: stepCountIs(3),
      });

      return {
        text: result.text,
        steps: result.steps.map((step) => ({
          text: step.text,
          toolCalls: step.toolCalls?.map((tc) => ({
            toolName: tc.toolName,
            args: "args" in tc ? (tc.args as Record<string, unknown>) : {},
          })),
          toolResults: step.toolResults?.map((tr) => ({
            toolName: tr.toolName,
            result: "result" in tr ? tr.result : undefined,
          })),
        })),
        finishReason: result.finishReason,
      };
    },
  };
};
