import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@tee-time/database";
import {
  clearBookingState,
  getBookingState,
  saveBookingState,
  wrapFlowState,
  unwrapFlowState,
} from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { isConfirmationMessage } from "../utils";

export type ModifyBookingInput = {
  message: string;
  memberId?: string;
  locale?: string;
  existingState?: Partial<ModifyBookingState>;
  confirmed?: boolean;
  db?: Database;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export type ModifyBookingState = {
  bookingId?: string;
  bookingReference?: string;
  club?: string;
  clubLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
  players?: number;
  guestNames?: string;
  notes?: string;
};

export type ModifyBookingDecision =
  | {
      type: "lookup";
      criteria: ModifyBookingState;
      prompt?: string;
      nextState: ModifyBookingState;
    }
  | {
      type: "need-booking-info";
      prompt: string;
      nextState: ModifyBookingState;
    }
  | {
      type: "confirm-update";
      prompt: string;
      nextState: ModifyBookingState;
    }
  | {
      type: "update";
      payload: ModifyBookingState;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const ModifyBookingParseSchema = z.object({
  bookingId: z.string().optional(),
  bookingReference: z.string().optional(),
  club: z.string().optional(),
  clubLocation: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  players: z.number().int().optional(),
  guestNames: z.string().optional(),
  notes: z.string().optional(),
});

const buildSummary = (state: ModifyBookingState) => {
  const parts = [
    state.bookingId ? `🆔 Booking ID: ${state.bookingId}` : null,
    state.bookingReference ? `🎫 Reference: ${state.bookingReference}` : null,
    state.club ? `⛳ Club: ${state.club}` : null,
    state.clubLocation ? `📍 Location: ${state.clubLocation}` : null,
    state.preferredDate ? `📅 Date: ${state.preferredDate}` : null,
    state.preferredTime ? `🕒 Time: ${state.preferredTime}` : null,
    state.players ? `👥 Players: ${state.players}` : null,
    state.guestNames ? `👤 Guests: ${state.guestNames}` : null,
    state.notes ? `📝 Notes: ${state.notes}` : null,
  ].filter(Boolean);

  return parts.length
    ? `Update the booking with:\n${parts.join("\n")}`
    : "Update this booking with the changes you provided?";
};

export const runModifyBookingFlow = async (
  input: ModifyBookingInput
): Promise<ModifyBookingDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt:
        "I can help modify a booking. Share the date/time or confirmation reference and what should change.",
    };
  }

  // Load persisted state if available
  const storedState =
    input.db && input.memberId
      ? await getBookingState<Record<string, unknown>>(input.db, input.memberId)
      : null;
  const persistedState = storedState
    ? unwrapFlowState<ModifyBookingState>(storedState.state, "modify-booking")
    : undefined;

  const state: ModifyBookingState = {
    ...(persistedState ?? {}),
    ...(input.existingState ?? {}),
  };

  const confirmed = input.confirmed ?? isConfirmationMessage(message);

  // Helper to persist state
  const persistState = async (nextState: ModifyBookingState) => {
    if (input.db && input.memberId) {
      await saveBookingState(
        input.db,
        input.memberId,
        wrapFlowState("modify-booking", nextState)
      );
    }
  };

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: ModifyBookingParseSchema,
      system:
        "Extract booking modification details from the message. Use the user's wording when possible.",
      prompt:
        `Conversation context:\n${(input.conversationHistory ?? [])
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}\n\n` +
        "Extract any of these fields if present: booking id, booking reference, club, club location, preferred date, preferred time, number of players, guest names, notes. " +
        `If a field is not present, omit it.\n\nUser message: "${message}"`,
    });

    Object.assign(
      state,
      Object.fromEntries(
        Object.entries(result.object).filter(([, value]) => value !== undefined)
      )
    );
  } catch {
    // Parsing failure should not block modification flow.
  }

  const hasLookupCriteria =
    state.bookingId ||
    state.bookingReference ||
    state.preferredDate ||
    state.preferredTime ||
    state.club ||
    state.clubLocation;

  if (!hasLookupCriteria) {
    await persistState(state);
    return {
      type: "need-booking-info",
      prompt:
        "Please share the booking date, time, or confirmation reference so I can find it.",
      nextState: state,
    };
  }

  if (!state.bookingId) {
    await persistState(state);
    return {
      type: "lookup",
      criteria: state,
      prompt:
        "Let me find that booking. If you have a confirmation ID, share it to speed things up.",
      nextState: state,
    };
  }

  if (confirmed) {
    // Clear state on successful update
    if (input.db && input.memberId) {
      await clearBookingState(input.db, input.memberId);
    }
    return {
      type: "update",
      payload: state,
    };
  }

  await persistState(state);
  return {
    type: "confirm-update",
    prompt: buildSummary(state),
    nextState: state,
  };
};
