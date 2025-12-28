import { createBookingRepository, type Database } from "@tee-time/database";
import { logger } from "./logger";

export type BookingLookupCriteria = {
  memberId: string;
  bookingId?: string;
  bookingReference?: string;
  preferredDate?: string;
  preferredTime?: string;
  timeframe?: "past" | "upcoming" | "any";
  now?: Date;
};

const isUuid = (value?: string) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const normalizeDate = (value?: string) => value?.trim();

const normalizeTime = (value?: string) =>
  value?.trim().toLowerCase().replace(/\s+/g, "");

const getBookingTimestamp = (bookingDate: Date, bookingTime: string) => {
  const dateIso = bookingDate.toISOString().slice(0, 10);
  const timeToken =
    bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
  const dateTime = new Date(`${dateIso}T${timeToken}`);
  return dateTime.getTime();
};

const matchesTimeframe = (
  bookingDate: Date,
  bookingTime: string,
  timeframe: "past" | "upcoming" | "any",
  now: Date
) => {
  if (timeframe === "any") {
    return true;
  }
  const timestamp = getBookingTimestamp(bookingDate, bookingTime);
  if (Number.isNaN(timestamp)) {
    return true;
  }
  if (timeframe === "past") {
    return timestamp < now.getTime();
  }
  return timestamp >= now.getTime();
};

const matchesDate = (bookingDate: Date, desired?: string) => {
  if (!desired) {
    return true;
  }
  const normalized = normalizeDate(desired);
  if (!normalized) {
    return true;
  }
  const bookingIso = bookingDate.toISOString().slice(0, 10);
  return bookingIso === normalized;
};

const matchesTime = (bookingTime: string, desired?: string) => {
  if (!desired) {
    return true;
  }
  const normalized = normalizeTime(desired);
  if (!normalized) {
    return true;
  }
  return normalizeTime(bookingTime).startsWith(normalized);
};

const matchesReference = (bookingReference: string | null, desired?: string) => {
  if (!desired) {
    return true;
  }
  const normalized = desired.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return bookingReference?.trim().toLowerCase() === normalized;
};

export const lookupMemberBooking = async (
  db: Database,
  criteria: BookingLookupCriteria
) => {
  const repo = createBookingRepository(db);
  const reference = criteria.bookingReference ?? criteria.bookingId;
  const bookingId = isUuid(reference)
    ? reference
    : criteria.bookingId && isUuid(criteria.bookingId)
    ? criteria.bookingId
    : undefined;

  if (bookingId) {
    const booking = await repo.getById(bookingId);
    if (booking && booking.memberId === criteria.memberId) {
      return booking;
    }
  }

  const bookings = await repo.listByMemberId(criteria.memberId);
  const matches = bookings.filter((booking) => {
    const referenceMatch = matchesReference(
      booking.bookingReference ?? null,
      criteria.bookingReference
    );
    const dateMatch = matchesDate(booking.preferredDate, criteria.preferredDate);
    const timeMatch = matchesTime(
      booking.preferredTimeStart,
      criteria.preferredTime
    );
    const timeframe = criteria.timeframe ?? "any";
    const now = criteria.now ?? new Date();
    const timeframeMatch = matchesTimeframe(
      booking.preferredDate,
      booking.preferredTimeStart,
      timeframe,
      now
    );
    return referenceMatch && dateMatch && timeMatch && timeframeMatch;
  });

  const timeframe = criteria.timeframe ?? "any";
  let booking = matches[0] ?? null;
  if (matches.length > 0 && timeframe !== "any") {
    const now = criteria.now ?? new Date();
    const withTimestamp = matches
      .map((match) => ({
        booking: match,
        timestamp: getBookingTimestamp(
          match.preferredDate,
          match.preferredTimeStart
        ),
      }))
      .filter((entry) => !Number.isNaN(entry.timestamp));
    withTimestamp.sort((a, b) =>
      timeframe === "past"
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp
    );
    booking = withTimestamp[0]?.booking ?? booking;
  }
  logger.info("core.booking.lookup", {
    memberId: criteria.memberId,
    found: Boolean(booking),
  });
  return booking;
};

export const formatBookingStatus = (booking: {
  status: string;
  preferredDate: Date;
  preferredTimeStart: string;
  preferredTimeEnd?: string | null;
}) => {
  const date = booking.preferredDate.toISOString().slice(0, 10);
  const timeWindow = booking.preferredTimeEnd
    ? `${booking.preferredTimeStart} - ${booking.preferredTimeEnd}`
    : booking.preferredTimeStart;
  const now = new Date();
  const bookingTimestamp = getBookingTimestamp(
    booking.preferredDate,
    booking.preferredTimeStart
  );
  const verb =
    Number.isNaN(bookingTimestamp) || bookingTimestamp >= now.getTime()
      ? "is"
      : "was";
  return `Your booking for ${date} at ${timeWindow} ${verb} ${booking.status}.`;
};
