import { generateObject } from "ai";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { isConfirmationMessage, sanitizePromptInput } from "../utils";

export type SupportHandoffInput = {
  message: string;
  memberId?: string;
  locale?: string;
  existingState?: Partial<SupportHandoffState>;
  confirmed?: boolean;
};

export type SupportHandoffState = {
  summary?: string;
  reason?: string;
};

export type SupportHandoffDecision =
  | {
      type: "confirm-handoff";
      prompt: string;
      nextState: SupportHandoffState;
    }
  | {
      type: "handoff";
      payload: SupportHandoffState;
    }
  | {
      type: "clarify";
      prompt: string;
    };



const SupportParseSchema = z.object({
  summary: z.string().nullable(),
  reason: z.string().nullable(),
});

const buildPrompt = (state: SupportHandoffState) => {
  const summary = state.summary ?? "your request";
  return `I can connect you to staff for help with ${summary}. Should I proceed?`;
};

export const runSupportHandoffFlow = async (
  input: SupportHandoffInput
): Promise<SupportHandoffDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt: "Tell me what you need help with, and I can connect you to staff.",
    };
  }

  const state: SupportHandoffState = { ...(input.existingState ?? {}) };
  const confirmed = input.confirmed ?? isConfirmationMessage(message);

  if (!confirmed || !state.summary) {
    try {
      const openrouter = getOpenRouterClient();
      const modelId = resolveModelId();
      const sanitizedMessage = sanitizePromptInput(message);
      const result = await generateObject({
        model: openrouter.chat(modelId),
        schema: SupportParseSchema,
        system:
          "Summarize the support request in one sentence and capture a short reason.",
        prompt:
          `Summarize the support request in plain language. If possible, extract a short reason.\n\nUser message: "${sanitizedMessage}"`,
      });

      Object.assign(
        state,
        Object.fromEntries(
          Object.entries(result.object).filter(([, value]) => value !== undefined && value !== null)
        )
      );
    } catch {
      // Parsing failure should not block support flow.
    }
  }

  if (confirmed) {
    return { type: "handoff", payload: state };
  }

  return {
    type: "confirm-handoff",
    prompt: buildPrompt(state),
    nextState: state,
  };
};
