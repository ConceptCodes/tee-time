import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@tee-time/database";
import {
  formatBookingStatus,
  lookupMemberBooking,
  parsePreferredDate,
  parsePreferredTimeWindow,
} from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";

export type BookingStatusFlowInput = {
  message: string;
  memberId?: string;
  locale?: string;
  db?: Database;
  lookupBooking?: (params: {
    memberId: string;
    bookingId?: string;
    bookingReference?: string;
    preferredDate?: string;
    preferredTime?: string;
  }) => Promise<{
    status: string;
    preferredDate: Date;
    preferredTimeStart: string;
    preferredTimeEnd?: string | null;
  } | null>;
  formatStatus?: (booking: {
    status: string;
    preferredDate: Date;
    preferredTimeStart: string;
    preferredTimeEnd?: string | null;
  }) => string;
};

export type BookingStatusFlowDecision =
  | {
      type: "need-booking-info";
      prompt: string;
    }
  | {
      type: "lookup";
      bookingReference: string;
    }
  | {
      type: "respond";
      message: string;
      offerBooking?: boolean;
    }
  | {
      type: "not-found";
      prompt: string;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const DEFAULT_BOOKING_INFO_PROMPT =
  "To check your booking, please share the date, time, or confirmation reference.";

const DEFAULT_CLARIFY_PROMPT =
  "Are you asking about a booking status? If so, share date, time, or a reference.";

const extractReference = (message: string) => {
  const match = message.match(/\b(?:ref|reference|booking)\s*#?\s*([a-z0-9-]{6,})\b/i);
  return match?.[1];
};

const BookingStatusParseSchema = z.object({
  preferredDate: z.string().nullable(),
  preferredTime: z.string().nullable(),
});

export const runBookingStatusFlow = async (
  input: BookingStatusFlowInput
): Promise<BookingStatusFlowDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return { type: "clarify", prompt: DEFAULT_CLARIFY_PROMPT };
  }

  const reference = extractReference(message);
  let preferredDate: string | undefined;
  let preferredTime: string | undefined;

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: BookingStatusParseSchema,
      system:
        "Extract booking date or time from the message if the user is asking about status.",
      prompt:
        "Extract preferred date and preferred time if present in the message. " +
        "If not present, return null.\n\n" +
        `User message: "${message}"`,
    });
    preferredDate = result.object.preferredDate ?? undefined;
    preferredTime = result.object.preferredTime ?? undefined;
  } catch {
    // Parsing failure should not block lookup.
  }

  if (preferredDate) {
    const parsedDate = parsePreferredDate(preferredDate);
    if (parsedDate) {
      preferredDate = parsedDate;
    }
  }

  if (preferredTime) {
    const parsedTime = parsePreferredTimeWindow(preferredTime);
    if (parsedTime) {
      preferredTime = parsedTime.start;
    }
  }

  if ((input.lookupBooking || input.db) && input.memberId) {
    const lookup =
      input.lookupBooking ??
      ((params: Parameters<typeof lookupMemberBooking>[1]) =>
        lookupMemberBooking(input.db as Database, params));
    const booking = await lookup({
      memberId: input.memberId,
      bookingId: reference,
      bookingReference: reference,
      preferredDate,
      preferredTime,
    });
    if (!booking) {
      if (!reference && !preferredDate && !preferredTime) {
        return {
          type: "respond",
          message: "You don't have any upcoming bookings. Would you like to book a tee time?",
          offerBooking: true,
        };
      }
      return {
        type: "not-found",
        prompt:
          "I couldn't find that booking. Can you share the date, time, or confirmation reference?",
      };
    }
    const formatter = input.formatStatus ?? formatBookingStatus;
    return { type: "respond", message: formatter(booking) };
  }

  if (reference) {
    return { type: "lookup", bookingReference: reference };
  }

  return { type: "need-booking-info", prompt: DEFAULT_BOOKING_INFO_PROMPT };
};
