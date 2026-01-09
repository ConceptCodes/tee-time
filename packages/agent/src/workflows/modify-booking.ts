import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@tee-time/database";
import {
  clearBookingState,
  getBookingState,
  saveBookingState,
  wrapFlowState,
  unwrapFlowState,
  lookupMemberBooking,
} from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { isConfirmationMessage, sanitizePromptInput } from "../utils";
import { formatModifySummary } from "@tee-time/core";

export type ModifyBookingInput = {
  message: string;
  memberId?: string;
  locale?: string;
  existingState?: Partial<ModifyBookingState>;
  confirmed?: boolean;
  db?: Database;
  lookupBooking?: (params: {
    memberId: string;
    bookingId?: string;
    bookingReference?: string;
    preferredDate?: string;
    preferredTime?: string;
    timeframe?: "past" | "upcoming" | "any";
  }) => Promise<{
    id: string;
    preferredDate: Date;
    preferredTimeStart: string;
    preferredTimeEnd?: string | null;
  } | null>;
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
    }
  | {
      type: "not-found";
      prompt: string;
    }
  | {
      type: "offer-booking";
      prompt: string;
    };

const ModifyBookingParseSchema = z.object({
  bookingId: z.string().nullable(),
  bookingReference: z.string().nullable(),
  club: z.string().nullable(),
  clubLocation: z.string().nullable(),
  preferredDate: z.string().nullable(),
  preferredTime: z.string().nullable(),
  players: z.number().int().nullable(),
  guestNames: z.string().nullable(),
  notes: z.string().nullable(),
});



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
    const sanitizedMessage = sanitizePromptInput(message);
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
        `If a field is not present, omit it.\n\nUser message: "${sanitizedMessage}"`,
    });

    Object.assign(
      state,
      Object.fromEntries(
        Object.entries(result.object).filter(([, value]) => value !== undefined && value !== null)
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

  // Perform actual booking lookup if we have criteria
  if (!state.bookingId && (input.lookupBooking || input.db) && input.memberId) {
    const lookup =
      input.lookupBooking ??
      ((params: Parameters<typeof lookupMemberBooking>[1]) =>
        lookupMemberBooking(input.db as Database, params));
    const booking = await lookup({
      memberId: input.memberId,
      bookingId: state.bookingId,
      bookingReference: state.bookingReference,
      preferredDate: state.preferredDate,
      preferredTime: state.preferredTime,
      timeframe: "upcoming",
    });
    if (!booking) {
      // No booking found - check if we have enough info or need more
      const hasWeakCriteria = !state.bookingReference &&
        (!state.preferredDate || !state.preferredTime);

      await persistState(state);
      if (hasWeakCriteria) {
        return {
          type: "need-booking-info",
          prompt:
            "I need more information to find your booking. Please share your confirmation reference or specify both the date and time of your booking.",
        };
      }
      return {
        type: "not-found",
        prompt:
          "I couldn't find an upcoming booking matching that information. Please verify the date, time, or share your confirmation reference.",
      };
    }
    // Found the booking - update state with booking info
    state.bookingId = booking.id;
    state.preferredDate = booking.preferredDate instanceof Date
      ? booking.preferredDate.toISOString().slice(0, 10)
      : String(booking.preferredDate).slice(0, 10);
    state.preferredTime = booking.preferredTimeEnd
      ? `${booking.preferredTimeStart} - ${booking.preferredTimeEnd}`
      : booking.preferredTimeStart;
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
    prompt: formatModifySummary(state),
    nextState: state,
  };
};
