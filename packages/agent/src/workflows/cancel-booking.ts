import { generateObject } from "ai";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";

export type CancelBookingInput = {
  message: string;
  memberId?: string;
  locale?: string;
  existingState?: Partial<CancelBookingState>;
  confirmed?: boolean;
};

export type CancelBookingState = {
  bookingId?: string;
  bookingReference?: string;
  club?: string;
  clubLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
};

export type CancelBookingDecision =
  | {
      type: "lookup";
      criteria: CancelBookingState;
      prompt?: string;
      nextState: CancelBookingState;
    }
  | {
      type: "need-booking-info";
      prompt: string;
      nextState: CancelBookingState;
    }
  | {
      type: "confirm-cancel";
      prompt: string;
      nextState: CancelBookingState;
    }
  | {
      type: "cancel";
      payload: CancelBookingState;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const CancelBookingParseSchema = z.object({
  bookingId: z.string().optional(),
  bookingReference: z.string().optional(),
  club: z.string().optional(),
  clubLocation: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  reason: z.string().optional(),
});

const buildSummary = (state: CancelBookingState) => {
  const parts = [
    state.bookingId ? `Booking ID: ${state.bookingId}` : null,
    state.bookingReference ? `Reference: ${state.bookingReference}` : null,
    state.club ? `Club: ${state.club}` : null,
    state.clubLocation ? `Location: ${state.clubLocation}` : null,
    state.preferredDate ? `Date: ${state.preferredDate}` : null,
    state.preferredTime ? `Time: ${state.preferredTime}` : null,
  ].filter(Boolean);

  return parts.length
    ? `Cancel the booking with ${parts.join(", ")}?`
    : "Cancel this booking?";
};

export const runCancelBookingFlow = async (
  input: CancelBookingInput
): Promise<CancelBookingDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt:
        "I can help cancel a booking. Please share the date, time, or confirmation reference.",
    };
  }

  const state: CancelBookingState = { ...(input.existingState ?? {}) };

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: CancelBookingParseSchema,
      system:
        "Extract cancellation details from the message. Use the user's wording when possible.",
      prompt:
        "Extract any of these fields if present: booking id, booking reference, club, club location, preferred date, preferred time, cancellation reason. " +
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
    // Parsing failure should not block cancellation flow.
  }

  const hasLookupCriteria =
    state.bookingId ||
    state.bookingReference ||
    state.preferredDate ||
    state.preferredTime ||
    state.club ||
    state.clubLocation;

  if (!hasLookupCriteria) {
    return {
      type: "need-booking-info",
      prompt:
        "Please share the booking date, time, or confirmation reference so I can cancel it.",
      nextState: state,
    };
  }

  if (!state.bookingId) {
    return {
      type: "lookup",
      criteria: state,
      prompt:
        "Let me find that booking. If you have a confirmation ID, share it to speed things up.",
      nextState: state,
    };
  }

  if (input.confirmed) {
    return {
      type: "cancel",
      payload: state,
    };
  }

  return {
    type: "confirm-cancel",
    prompt: buildSummary(state),
    nextState: state,
  };
};
