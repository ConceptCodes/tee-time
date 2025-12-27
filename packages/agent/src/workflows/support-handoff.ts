import { generateObject } from "ai";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";

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
  summary: z.string().optional(),
  reason: z.string().optional(),
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

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: SupportParseSchema,
      system:
        "Summarize the support request in one sentence and capture a short reason.",
      prompt:
        "Summarize the support request in plain language. If possible, extract a short reason.",
      input: { message },
    });

    Object.assign(
      state,
      Object.fromEntries(
        Object.entries(result.object).filter(([, value]) => value !== undefined)
      )
    );
  } catch {
    // Parsing failure should not block support flow.
  }

  if (input.confirmed) {
    return { type: "handoff", payload: state };
  }

  return {
    type: "confirm-handoff",
    prompt: buildPrompt(state),
    nextState: state,
  };
};
