import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@tee-time/database";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { createMemberProfile, updateMemberProfile } from "@tee-time/core";
import { isConfirmationMessage, isNegativeReply, isSkipReply } from "../utils";

export type OnboardingInput = {
  message: string;
  phoneNumber: string;
  existingMemberId?: string;
  existingState?: Partial<OnboardingState>;
  defaults?: Partial<OnboardingState>;
  db?: Database;
  submitMember?: (payload: Parameters<typeof createMemberProfile>[1]) => Promise<{
    memberId: string;
  }>;
  /** Conversation history for multi-turn context */
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
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
  preferredBay?: string;
  lastPromptedField?: OnboardingField;
  pendingSkipField?: OnboardingField;
  skippedFields?: OnboardingField[];
};

type OnboardingField =
  | "name"
  | "timezone"
  | "favoriteClub"
  | "favoriteLocation"
  | "preferredBay";

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
      type: "confirm-skip";
      prompt: string;
      nextState: OnboardingState;
    }
  | {
      type: "complete";
      payload: OnboardingState;
    }
  | {
      type: "submitted";
      memberId: string;
      payload: OnboardingState;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const OnboardingParseSchema = z.object({
  name: z.string().nullable(),
  timezone: z.string().nullable(),
  favoriteClub: z.string().nullable(),
  favoriteLocation: z.string().nullable(),
  preferredBay: z.string().nullable(),
});

const REQUIRED_FIELDS: OnboardingField[] = ["name"];
const OPTIONAL_FIELDS: OnboardingField[] = [
  "timezone",
  "favoriteClub",
  "favoriteLocation",
  "preferredBay",
];
const DEFAULT_TIMEZONE = "Etc/UTC";

const PROMPTS: Record<OnboardingField, string> = {
  name: "What name should we use for your member profile?",
  timezone: "What timezone are you in? (e.g., Europe/London)",
  favoriteClub: "Do you have a favorite club?",
  favoriteLocation: "Do you have a preferred club location?",
  preferredBay: "Do you have a preferred bay?",
};

const buildAskPrompt = (
  field: OnboardingField,
  basePrompt: string,
  suggestions?: OnboardingInput["suggestions"]
) => {
  const isOptional = OPTIONAL_FIELDS.includes(field);
  const skipHint = isOptional ? " You can say \"skip\"." : "";
  if (field === "timezone" && suggestions?.timezones?.length) {
    return `${basePrompt} Options: ${suggestions.timezones.join(", ")}.${skipHint}`;
  }
  if (field === "favoriteClub" && suggestions?.clubs?.length) {
    return `${basePrompt} Options: ${suggestions.clubs.join(", ")}.${skipHint}`;
  }
  if (field === "favoriteLocation" && suggestions?.clubLocations?.length) {
    return `${basePrompt} Options: ${suggestions.clubLocations.join(", ")}.${skipHint}`;
  }
  return `${basePrompt}${skipHint}`;
};

const buildDefaultPrompt = (field: OnboardingField, value: string) => {
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

const buildSkipConfirmPrompt = (field: OnboardingField) => {
  switch (field) {
    case "timezone":
      return `No problem. If we skip this, I'll use "${DEFAULT_TIMEZONE}" as your timezone. Is that okay?`;
    case "favoriteClub":
      return "No problem. Skip favorite club for now?";
    case "favoriteLocation":
      return "No problem. Skip preferred location for now?";
    case "preferredBay":
      return "No problem. Skip preferred bay for now?";
    default:
      return "No problem. Skip this for now?";
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

const nextOptionalField = (state: OnboardingState) => {
  const skipped = new Set(state.skippedFields ?? []);
  return OPTIONAL_FIELDS.find((field) => !state[field] && !skipped.has(field));
};

const applySkip = (state: OnboardingState, field: OnboardingField) => {
  const skipped = new Set(state.skippedFields ?? []);
  skipped.add(field);
  const nextState: OnboardingState = {
    ...state,
    pendingSkipField: undefined,
    skippedFields: Array.from(skipped),
  };
  if (field === "timezone" && !nextState.timezone) {
    nextState.timezone = DEFAULT_TIMEZONE;
  }
  return nextState;
};

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

  let state: OnboardingState = {
    ...(input.defaults ?? {}),
    ...(input.existingState ?? {}),
    skippedFields: input.existingState?.skippedFields ?? [],
  };

  if (state.pendingSkipField) {
    if (isConfirmationMessage(message)) {
      state = applySkip(state, state.pendingSkipField);
    } else if (isNegativeReply(message)) {
      const field = state.pendingSkipField;
      state.pendingSkipField = undefined;
      return {
        type: "ask",
        prompt: buildAskPrompt(field, PROMPTS[field], input.suggestions),
        nextState: {
          ...state,
          lastPromptedField: field,
        },
      };
    } else {
      return {
        type: "clarify",
        prompt: "Please reply yes to skip or no to share those details.",
      };
    }
  }

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const historyContext = input.conversationHistory?.length
      ? `\nConversation context:\n${input.conversationHistory
          .map((entry) => `${entry.role}: ${entry.content}`)
          .join("\n")}\n`
      : "";
    
    // Tell the LLM what field we just asked for so it knows the user is likely answering that
    const lastFieldContext = state.lastPromptedField
      ? `The assistant just asked for the user's ${state.lastPromptedField.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}. If the user's response looks like a ${state.lastPromptedField === 'name' ? 'name' : 'value'}, extract it as "${state.lastPromptedField}".\n\n`
      : "";
    
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: OnboardingParseSchema,
      system:
        "Extract onboarding details from the message. Use the user's wording when possible. " +
        "If the user provides a short response that looks like a name (e.g., 'John', 'Sarah Smith'), extract it as 'name'.",
      prompt:
        `${historyContext}${lastFieldContext}Extract any of these fields if present: name, timezone, favorite club, favorite location, preferred bay. ` +
        `If a field is not present, omit it.\n\nUser message: "${message}"`,
    });

    // Convert null to undefined for state compatibility
    const cleaned = Object.fromEntries(
      Object.entries(result.object).map(([k, v]) => [k, v ?? undefined])
    ) as Partial<OnboardingState>;
    Object.assign(state, applyParsedFields(state, cleaned));
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
      nextState: { ...state, lastPromptedField: missing },
    };
  }

  const lastPromptedField = state.lastPromptedField;
  if (
    lastPromptedField &&
    OPTIONAL_FIELDS.includes(lastPromptedField) &&
    !state[lastPromptedField] &&
    !(state.skippedFields ?? []).includes(lastPromptedField) &&
    (isSkipReply(message) || isNegativeReply(message))
  ) {
    // Immediately apply skip and move to next question (no confirmation needed)
    const skippedState = applySkip(state, lastPromptedField);
    
    // Check if there are more optional fields to ask
    const nextOptional = nextOptionalField(skippedState);
    if (nextOptional) {
      return {
        type: "ask",
        prompt: `Got it! ${buildAskPrompt(nextOptional, PROMPTS[nextOptional], input.suggestions)}`,
        nextState: { ...skippedState, lastPromptedField: nextOptional },
      };
    }
    
    // No more fields - complete onboarding
    state = skippedState;
  }

  const optionalMissing = nextOptionalField(state);
  if (optionalMissing) {
    return {
      type: "ask",
      prompt: buildAskPrompt(optionalMissing, PROMPTS[optionalMissing], input.suggestions),
      nextState: { ...state, lastPromptedField: optionalMissing },
    };
  }

  if (input.submitMember || input.db) {
    const now = new Date();
    const favoriteLocationLabel =
      state.favoriteLocation ?? state.favoriteClub ?? "Unknown";
    const payload = {
      phoneNumber: input.phoneNumber,
      name: state.name as string,
      timezone: (state.timezone ?? DEFAULT_TIMEZONE) as string,
      favoriteLocationLabel,
      preferredLocationLabel: state.favoriteLocation ?? undefined,
      preferredTimeOfDay: undefined,
      preferredBayLabel: state.preferredBay ?? undefined,
      onboardingCompletedAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const submit =
      input.submitMember ??
      (input.db
        ? async (memberPayload: Parameters<typeof createMemberProfile>[1]) => {
            if (input.existingMemberId) {
              const member = await updateMemberProfile(
                input.db as Database,
                input.existingMemberId,
                {
                  name: memberPayload.name,
                  timezone: memberPayload.timezone,
                  favoriteLocationLabel: memberPayload.favoriteLocationLabel,
                  preferredLocationLabel: memberPayload.preferredLocationLabel,
                  preferredTimeOfDay: memberPayload.preferredTimeOfDay,
                  preferredBayLabel: memberPayload.preferredBayLabel,
                  onboardingCompletedAt: memberPayload.onboardingCompletedAt,
                  isActive: memberPayload.isActive,
                  updatedAt: memberPayload.updatedAt,
                }
              );
              return { memberId: member?.id ?? input.existingMemberId };
            }
            const member = await createMemberProfile(
              input.db as Database,
              memberPayload
            );
            return { memberId: member.id };
          }
        : undefined);
    if (submit) {
      const result = await submit(payload);
      return {
        type: "submitted",
        memberId: result.memberId,
        payload: state,
      };
    }
  }

  return {
    type: "complete",
    payload: state,
  };
};
