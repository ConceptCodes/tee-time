import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@tee-time/database";
import {
  cancelBookingWithHistory,
  lookupMemberBooking,
  parsePreferredDate,
  parsePreferredTimeWindow
} from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";

export type CancelBookingInput = {
  message: string;
  memberId?: string;
  locale?: string;
  existingState?: Partial<CancelBookingState>;
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
  cancelBooking?: (params: {
    bookingId: string;
    memberId: string;
    reason?: string | null;
  }) => Promise<{ bookingId: string; status: string }>;
  notify?: boolean;
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
      type: "cancelled";
      bookingId: string;
      message: string;
    }
  | {
      type: "not-found";
      prompt: string;
    }
  | {
      type: "not-allowed";
      prompt: string;
    }
  | {
      type: "offer-booking";
      prompt: string;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const isConfirmationMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 32) {
    return false;
  }
  if (/\d/.test(normalized)) {
    return false;
  }
  if (/(change|edit|update|instead|actually|but)/.test(normalized)) {
    return false;
  }
  return /^(yes|yep|yeah|y|ok|okay|confirm|confirmed|please do|do it|cancel it|sounds good|looks good|correct|that's right|that works)$/.test(
    normalized
  );
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

  if (state.preferredDate) {
    const parsedDate = parsePreferredDate(state.preferredDate);
    if (parsedDate) {
      state.preferredDate = parsedDate;
    }
  }

  if (state.preferredTime) {
    const parsedTime = parsePreferredTimeWindow(state.preferredTime);
    if (parsedTime) {
      state.preferredTime = parsedTime.start;
    }
  }

  const hasLookupCriteria =
    state.bookingId ||
    state.bookingReference ||
    state.preferredDate ||
    state.preferredTime ||
    state.club ||
    state.clubLocation;

  const confirmed = input.confirmed ?? isConfirmationMessage(message);

  if (!hasLookupCriteria) {
    if ((input.lookupBooking || input.db) && input.memberId) {
      const lookup =
        input.lookupBooking ??
        ((params: Parameters<typeof lookupMemberBooking>[1]) =>
          lookupMemberBooking(input.db as Database, params));
      const booking = await lookup({
        memberId: input.memberId,
        timeframe: "upcoming",
      });
      if (!booking) {
        return {
          type: "offer-booking",
          prompt:
            "You don't have any upcoming bookings. Would you like to book a tee time?",
        };
      }
      state.bookingId = booking.id;
      state.preferredDate = booking.preferredDate.toISOString().slice(0, 10);
      state.preferredTime = booking.preferredTimeEnd
        ? `${booking.preferredTimeStart} - ${booking.preferredTimeEnd}`
        : booking.preferredTimeStart;
      return {
        type: "confirm-cancel",
        prompt: buildSummary(state),
        nextState: state,
      };
    }
    return {
      type: "need-booking-info",
      prompt:
        "Please share the booking date, time, or confirmation reference so I can cancel it.",
      nextState: state,
    };
  }

  if ((input.lookupBooking || input.db) && input.memberId) {
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
      return {
        type: "not-found",
        prompt:
          "I couldn't find that booking. Can you share the date, time, or confirmation reference?",
      };
    }
    state.bookingId = booking.id;
    state.preferredDate = booking.preferredDate.toISOString().slice(0, 10);
    state.preferredTime = booking.preferredTimeEnd
      ? `${booking.preferredTimeStart} - ${booking.preferredTimeEnd}`
      : booking.preferredTimeStart;

    if (confirmed) {
      const cancel =
        input.cancelBooking ??
        (input.db
          ? async (payload: {
              bookingId: string;
              memberId: string;
              reason?: string | null;
            }) => {
              const result = await cancelBookingWithHistory(
                input.db as Database,
                {
                  bookingId: payload.bookingId,
                  memberId: payload.memberId,
                  reason: payload.reason ?? null,
                  notify: input.notify ?? true
                }
              );
              if (!result.booking) {
                throw new Error("booking_not_found");
              }
              return {
                bookingId: result.booking.id,
                status: result.booking.status as string
              };
            }
          : undefined);
      if (cancel) {
        try {
          const result = await cancel({
            bookingId: state.bookingId,
            memberId: input.memberId,
            reason: state.reason ?? null
          });
          return {
            type: "cancelled",
            bookingId: result.bookingId,
            message: "Your booking has been cancelled. I'll let the team know."
          };
        } catch (error) {
          if ((error as Error)?.message === "cancellation_window_exceeded") {
            return {
              type: "not-allowed",
              prompt:
                "That booking is too close to the tee time to cancel automatically. I can connect you with staff if needed."
            };
          }
          if ((error as Error)?.message === "booking_not_found") {
            return {
              type: "not-found",
              prompt:
                "I couldn't find that booking. Can you share the date, time, or confirmation reference?"
            };
          }
          throw error;
        }
      }
    }

    return {
      type: "confirm-cancel",
      prompt: buildSummary(state),
      nextState: state
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

  if (confirmed) {
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
