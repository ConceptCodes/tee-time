import { generateObject } from "ai";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";

export type OnboardingInput = {
  message: string;
  phoneNumber: string;
  existingState?: Partial<OnboardingState>;
  defaults?: Partial<OnboardingState>;
  suggestions?: {
    timezones?: string[];
    clubs?: string[];
    clubLocations?: string[];
  };
};

export type OnboardingState = {
  name?: string;
  timezone?: string;
  favoriteClub?: string;
  favoriteLocation?: string;
};

export type OnboardingDecision =
  | {
      type: "ask";
      prompt: string;
      nextState: OnboardingState;
    }
  | {
      type: "confirm-default";
      prompt: string;
      nextState: OnboardingState;
    }
  | {
      type: "complete";
      payload: OnboardingState;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const OnboardingParseSchema = z.object({
  name: z.string().optional(),
  timezone: z.string().optional(),
  favoriteClub: z.string().optional(),
  favoriteLocation: z.string().optional(),
});

const REQUIRED_FIELDS: Array<keyof OnboardingState> = ["name", "timezone"];

const PROMPTS: Record<keyof OnboardingState, string> = {
  name: "What name should we use for your member profile?",
  timezone: "What timezone are you in? (e.g., Europe/London)",
  favoriteClub: "Do you have a favorite club?",
  favoriteLocation: "Do you have a preferred club location?",
};

const buildAskPrompt = (
  field: keyof OnboardingState,
  basePrompt: string,
  suggestions?: OnboardingInput["suggestions"]
) => {
  if (field === "timezone" && suggestions?.timezones?.length) {
    return `${basePrompt} Options: ${suggestions.timezones.join(", ")}.`;
  }
  if (field === "favoriteClub" && suggestions?.clubs?.length) {
    return `${basePrompt} Options: ${suggestions.clubs.join(", ")}.`;
  }
  if (field === "favoriteLocation" && suggestions?.clubLocations?.length) {
    return `${basePrompt} Options: ${suggestions.clubLocations.join(", ")}.`;
  }
  return basePrompt;
};

const buildDefaultPrompt = (field: keyof OnboardingState, value: string) => {
  switch (field) {
    case "timezone":
      return `I can set your timezone to "${value}". Does that look right?`;
    case "favoriteClub":
      return `I can set your favorite club to "${value}". Want to use that?`;
    case "favoriteLocation":
      return `I can set your favorite location to "${value}". Want to use that?`;
    default:
      return `I can use "${value}". Does that work?`;
  }
};

const applyParsedFields = (
  state: OnboardingState,
  parsed: Partial<OnboardingState>
) => ({
  ...state,
  ...Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined)
  ),
});

const nextMissingField = (state: OnboardingState) =>
  REQUIRED_FIELDS.find((field) => !state[field]);

export const runOnboardingFlow = async (
  input: OnboardingInput
): Promise<OnboardingDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt: "Welcome! To get started, what name should we use for you?",
    };
  }

  const state: OnboardingState = {
    ...(input.defaults ?? {}),
    ...(input.existingState ?? {}),
  };

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: OnboardingParseSchema,
      system:
        "Extract onboarding details from the message. Use the user's wording when possible.",
      prompt:
        "Extract any of these fields if present: name, timezone, favorite club, favorite location. " +
        "If a field is not present, omit it.",
      input: { message },
    });

    Object.assign(state, applyParsedFields(state, result.object));
  } catch {
    // Parsing failure should not block onboarding.
  }

  const missing = nextMissingField(state);
  if (missing) {
    const defaultValue = input.defaults?.[missing];
    if (defaultValue !== undefined) {
      return {
        type: "confirm-default",
        prompt: buildDefaultPrompt(missing, String(defaultValue)),
        nextState: state,
      };
    }
    return {
      type: "ask",
      prompt: buildAskPrompt(missing, PROMPTS[missing], input.suggestions),
      nextState: state,
    };
  }

  return {
    type: "complete",
    payload: state,
  };
};
