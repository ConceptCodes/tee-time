import { generateObject } from "ai";
import { z } from "zod";
import { createBookingRepository, createMemberRepository, type Database } from "@tee-time/database";
import {
  formatBookingStatus,
  lookupAllMemberBookings,
  lookupMemberBooking,
  parsePreferredDate,
  parsePreferredTimeWindow,
} from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { sanitizePromptInput } from "../utils";

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
    timeframe?: "past" | "upcoming" | "any";
  }) => Promise<{
    status: string;
    preferredDate: Date | string;
    preferredTimeStart: string;
    preferredTimeEnd?: string | null;
  } | null>;
  formatStatus?: (booking: {
    status: string;
    preferredDate: Date | string;
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
      allowSelection?: boolean;
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
  "To check your booking, share the date, time, or confirmation reference.";

const DEFAULT_CLARIFY_PROMPT =
  "Looking for a booking status? Share the date, time, or confirmation reference.";

const BookingStatusParseSchema = z.object({
  bookingReference: z.string().nullable(),
  preferredDate: z.string().nullable(),
  preferredTime: z.string().nullable(),
  timeframe: z.enum(["past", "upcoming", "any"]).nullable(),
});

const toIsoDate = (value: Date | string) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().slice(0, 10);
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const isUpcoming = (booking: {
  preferredDate: Date | string;
  preferredTimeStart: string;
}) => {
  const dateIso = toIsoDate(booking.preferredDate);
  if (!dateIso) {
    return true;
  }
  const timeToken =
    booking.preferredTimeStart.length === 5
      ? `${booking.preferredTimeStart}:00`
      : booking.preferredTimeStart;
  const timestamp = new Date(`${dateIso}T${timeToken}`).getTime();
  if (Number.isNaN(timestamp)) {
    return true;
  }
  return timestamp >= Date.now();
};

const formatBookingChoice = (booking: {
  preferredDate: Date | string;
  preferredTimeStart: string;
  preferredTimeEnd?: string | null;
}) => {
  const date = toIsoDate(booking.preferredDate) ?? "Unknown date";
  const timeWindow = booking.preferredTimeEnd
    ? `${booking.preferredTimeStart} - ${booking.preferredTimeEnd}`
    : booking.preferredTimeStart;
  return `📅 ${date} at 🕒 ${timeWindow}`;
};

export const runBookingStatusFlow = async (
  input: BookingStatusFlowInput
): Promise<BookingStatusFlowDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return { type: "clarify", prompt: DEFAULT_CLARIFY_PROMPT };
  }

  let reference: string | undefined;
  let timeframe: "past" | "upcoming" | "any" | undefined;
  let preferredDate: string | undefined;
  let preferredTime: string | undefined;

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const sanitizedMessage = sanitizePromptInput(message);
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: BookingStatusParseSchema,
      system:
        "Extract booking status lookup details from the message. " +
        "Return booking reference, preferred date, preferred time, and timeframe (past/upcoming/any) if mentioned. " +
        "If a field is not present, return null.",
      prompt:
        `User message: "${sanitizedMessage}"`,
    });
    reference = result.object.bookingReference ?? undefined;
    preferredDate = result.object.preferredDate ?? undefined;
    preferredTime = result.object.preferredTime ?? undefined;
    timeframe = result.object.timeframe ?? undefined;
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

  // Look up member timezone if available
  let memberTimezone: string | undefined;
  if (input.memberId && input.db) {
    const memberRepo = createMemberRepository(input.db);
    const member = await memberRepo.getById(input.memberId);
    memberTimezone = member?.timezone;
  }

  // Always attempt database lookup if memberId is available - don't escalate without trying
  if (input.memberId) {
    // If database is not available, escalate to human support
    if (!input.lookupBooking && !input.db) {
      return {
        type: "not-found",
        prompt:
          "I'm unable to access the booking database at the moment. Would you like me to connect you with human support who can check your upcoming bookings?",
      };
    }

    const lookup =
      input.lookupBooking ??
      ((params: Parameters<typeof lookupMemberBooking>[1]) =>
        lookupMemberBooking(input.db as Database, params));
    const hasActionableCriteria = Boolean(
      reference || preferredDate || preferredTime
    );
    if (!hasActionableCriteria && input.db && timeframe !== "past") {
      const allBookings = await lookupAllMemberBookings(input.db, input.memberId, "upcoming");
      if (allBookings.length === 0) {
        return {
          type: "respond",
          message:
            "You don't have any upcoming bookings. Would you like to book a tee time?",
          offerBooking: true,
        };
      }
      if (allBookings.length > 1) {
        const choices = allBookings
          .slice(0, 5)
          .map((booking, index) => `${index + 1}. ${formatBookingChoice(booking)}`)
          .join("\n");
        return {
          type: "respond",
          message:
            `You have ${allBookings.length} upcoming booking${allBookings.length > 1 ? 's' : ''}:\n\n${choices}\n\n` +
            `Which one would you like details for? Reply with the number.`,
          allowSelection: true,
        };
      }
      const formatter = input.formatStatus ?? formatBookingStatus;
      return { type: "respond", message: formatter(allBookings[0]) };
    }
    const booking = await lookup({
      memberId: input.memberId,
      bookingId: reference,
      bookingReference: reference,
      preferredDate,
      preferredTime,
      timeframe: timeframe ?? "any",
    });
    if (!booking) {
      if (!reference && !preferredDate && !preferredTime) {
        if (timeframe === "past") {
          return {
            type: "respond",
            message: "You don't have any past bookings.",
          };
        }
        return {
          type: "respond",
          message:
            "You don't have any upcoming bookings. Would you like to book a tee time?",
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
