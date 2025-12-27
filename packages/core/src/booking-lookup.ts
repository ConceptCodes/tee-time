import { createBookingRepository, type Database } from "@tee-time/database";
import { logger } from "./logger";

export type BookingLookupCriteria = {
  memberId: string;
  bookingId?: string;
  bookingReference?: string;
  preferredDate?: string;
  preferredTime?: string;
};

const isUuid = (value?: string) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const normalizeDate = (value?: string) => value?.trim();

const normalizeTime = (value?: string) =>
  value?.trim().toLowerCase().replace(/\s+/g, "");

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

export const lookupMemberBooking = async (
  db: Database,
  criteria: BookingLookupCriteria
) => {
  const repo = createBookingRepository(db);
  const reference = criteria.bookingReference ?? criteria.bookingId;
  const bookingId = isUuid(reference) ? reference : criteria.bookingId;

  if (bookingId) {
    const booking = await repo.getById(bookingId);
    if (booking && booking.memberId === criteria.memberId) {
      return booking;
    }
  }

  const bookings = await repo.listByMemberId(criteria.memberId);
  const matches = bookings.filter((booking) => {
    const dateMatch = matchesDate(booking.preferredDate, criteria.preferredDate);
    const timeMatch = matchesTime(
      booking.preferredTimeStart,
      criteria.preferredTime
    );
    return dateMatch && timeMatch;
  });

  const booking = matches[0] ?? null;
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
  return `Your booking for ${date} at ${timeWindow} is ${booking.status}.`;
};
