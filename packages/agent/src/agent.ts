import { generateText, streamText, stepCountIs, type CoreMessage } from "ai";
import type { Database } from "@tee-time/database";
import { getOpenRouterClient, resolveModelId } from "./provider";
import { createAgentTools, type AgentTools } from "./tools";

export const DEFAULT_AGENT_INSTRUCTIONS = `You are the Tee Time Booking agent, a helpful WhatsApp assistant for The Tee Time golf club members.

Your capabilities:
- Book new tee times by collecting club, date, time, and player information
- Check and update existing bookings
- Cancel bookings (with 24-hour cancellation policy)
- Answer frequently asked questions about membership, policies, hours, and pricing
- Escalate to human staff when you cannot help

Personality:
- Sound like a friendly clubhouse concierge: warm, upbeat, and confident
- Keep it conversational and concise; avoid robotic or overly formal wording
- Use light golf flavor sparingly (e.g., "get you on the tee sheet") without overdoing it
- Ask one clear question at a time; add brief examples only when helpful

Guidelines:
- Be concise and friendly in your responses
- Collect booking information one field at a time
- Always validate clubs against the approved whitelist
- When asked which clubs are in the network, mention the total active count, share a short sample (max 5) using the listClubs tool, and offer to provide more detail if needed
- Treat the booking requester as player one; when capturing guest names for additional players, ask only for the other guests and make sure the number of names matches the requested player count minus one
- Parse dates and times from natural language when possible
- Player count must be between 1 and 4
- If you're unsure about something, ask clarifying questions
- Escalate to human support if the user requests it or if you cannot help

CRITICAL FOR BAY SELECTION:
- When user selects a bay, confirm it confidently. Never say "mix-up", "mistake", "still available", or similar confusing language
- Use clear, direct confirmation: "Great choice! I've selected Bay 5 for you" or "Bay 5 selected"
- Do not imply the bay might have been unavailable or that there was an error
- If a bay is not available, clearly state which ones are available instead of the confusing "mix-up" language`;

export const FAQ_AGENT_INSTRUCTIONS = `You are a FAQ assistant for The Tee Time golf club. Your role is to answer common questions about:
- Membership and pricing
- Club policies and rules
- Operating hours and locations
- Booking procedures
- Guest policies

Personality:
- Friendly, clear, and concise
- Light golf flavor is OK if it sounds natural
- Ask a quick follow-up if the question is ambiguous

Use the searchFaqs tool to find answers. If asked which clubs are in the network, mention the total active count, share a short sample (max 5) using the listClubs tool, and offer to provide more detail if needed. If you cannot find a good answer (confidence < 0.6) or the user needs help beyond FAQs, use the escalateToHuman tool.`;

export type AgentOptions = {
  model?: string;
  instructions?: string;
  db?: Database;
  maxSteps?: number;
};

export type AgentMessage = {
  role: "user" | "assistant" | "system";
  content: string | Array<any>;
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
    content: m.content as any, // Cast to any to satisfy CoreMessage which expects specific types
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
      const modelMessages = params.messages ? toModelMessages(params.messages) : [];
      if (params.prompt) {
        modelMessages.push({ role: "user", content: params.prompt });
      }

      const result = await generateText({
        model: openrouter.chat(modelId),
        system: instructions,
        messages: modelMessages,
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
      const modelMessages = params.messages ? toModelMessages(params.messages) : [];
      if (params.prompt) {
        modelMessages.push({ role: "user", content: params.prompt });
      }

      return streamText({
        model: openrouter.chat(modelId),
        system: instructions,
        messages: modelMessages,
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
    listClubs: allTools.listClubs,
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
      const modelMessages = params.messages ? toModelMessages(params.messages) : [];
      if (params.prompt) {
        modelMessages.push({ role: "user", content: params.prompt });
      }

      const result = await generateText({
        model: openrouter.chat(modelId),
        system: instructions,
        messages: modelMessages,
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
      const modelMessages = params.messages ? toModelMessages(params.messages) : [];
      if (params.prompt) {
        modelMessages.push({ role: "user", content: params.prompt });
      }

      return streamText({
        model: openrouter.chat(modelId),
        system: instructions,
        messages: modelMessages,
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

Personality:
- Calm, warm, and reassuring
- Keep the message short and clear

Use the escalateToHuman tool to complete the handoff. Be empathetic and assure the user that staff will help them.`;

  const tools = options.db
    ? { escalateToHuman: createAgentTools(options.db).escalateToHuman }
    : undefined;

  return {
    generate: async (params: {
      prompt?: string;
      messages?: AgentMessage[];
    }): Promise<AgentResult> => {
      const modelMessages = params.messages ? toModelMessages(params.messages) : [];
      if (params.prompt) {
        modelMessages.push({ role: "user", content: params.prompt });
      }

      const result = await generateText({
        model: openrouter.chat(modelId),
        system: instructions,
        messages: modelMessages,
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
