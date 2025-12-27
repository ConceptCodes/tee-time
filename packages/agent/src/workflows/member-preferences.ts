import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@syndicate/database";
import { updateMemberPreferences } from "@syndicate/core";
import { getOpenRouterClient, resolveModelId } from "../provider";

export type MemberPreferencesInput = {
  message: string;
  memberId: string;
  existingState?: Partial<MemberPreferencesState>;
  db?: Database;
  updatePreferences?: (payload: MemberPreferencesState) => Promise<{
    memberId: string;
  } | null>;
  suggestions?: {
    locations?: string[];
    bays?: string[];
    timeWindows?: string[];
  };
};

export type MemberPreferencesState = {
  preferredLocation?: string;
  preferredTimeOfDay?: string;
  preferredBay?: string;
};

export type MemberPreferencesDecision =
  | {
      type: "update";
      payload: MemberPreferencesState;
    }
  | {
      type: "updated";
      message: string;
    }
  | {
      type: "ask";
      prompt: string;
      nextState: MemberPreferencesState;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const MemberPreferencesSchema = z.object({
  preferredLocation: z.string().optional(),
  preferredTimeOfDay: z.string().optional(),
  preferredBay: z.string().optional(),
});

const buildAskPrompt = (
  field: keyof MemberPreferencesState,
  suggestions?: MemberPreferencesInput["suggestions"]
) => {
  if (field === "preferredLocation") {
    const options = suggestions?.locations?.length
      ? ` Options: ${suggestions.locations.join(", ")}.`
      : "";
    return `Which location do you prefer?${options}`;
  }
  if (field === "preferredTimeOfDay") {
    const options = suggestions?.timeWindows?.length
      ? ` Options: ${suggestions.timeWindows.join(", ")}.`
      : "";
    return `What time of day do you prefer?${options}`;
  }
  if (field === "preferredBay") {
    const options = suggestions?.bays?.length
      ? ` Options: ${suggestions.bays.join(", ")}.`
      : "";
    return `Do you have a preferred bay?${options}`;
  }
  return "What would you like to update?";
};

export const runMemberPreferencesFlow = async (
  input: MemberPreferencesInput
): Promise<MemberPreferencesDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt:
        "Tell me your preferred location, time of day, or bay and I’ll update your profile.",
    };
  }

  const state: MemberPreferencesState = { ...(input.existingState ?? {}) };

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: MemberPreferencesSchema,
      system:
        "Extract preferred booking preferences from the message. Use the user's wording when possible.",
      prompt:
        "Extract any of these fields if present: preferred location, preferred time of day, preferred bay. " +
        "If a field is not present, omit it.",
      input: { message },
    });

    Object.assign(
      state,
      Object.fromEntries(
        Object.entries(result.object).filter(([, value]) => value !== undefined)
      )
    );
  } catch {
    // Parsing failure should not block updates.
  }

  const missing =
    !state.preferredLocation && !state.preferredTimeOfDay && !state.preferredBay;
  if (missing) {
    return {
      type: "ask",
      prompt: buildAskPrompt("preferredLocation", input.suggestions),
      nextState: state,
    };
  }

  const update =
    input.updatePreferences ??
    (input.db
      ? async (payload: MemberPreferencesState) =>
          updateMemberPreferences(input.db as Database, input.memberId, {
            preferredLocationLabel: payload.preferredLocation,
            preferredTimeOfDay: payload.preferredTimeOfDay,
            preferredBayLabel: payload.preferredBay,
          })
      : undefined);

  if (update) {
    const result = await update(state);
    if (result) {
      return {
        type: "updated",
        message: "Got it. I’ve saved your preferences.",
      };
    }
  }

  return {
    type: "update",
    payload: state,
  };
};
