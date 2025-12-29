import { randomBytes } from "crypto";
import {
  createBookingRepository,
  createBookingStatusHistoryRepository,
  createClubLocationBayRepository,
  type Booking,
  type Database,
} from "@tee-time/database";
import { notifyBooking } from "./notifications/slack";
import { logger } from "./logger";

export type CreateBookingParams = {
  memberId: string;
  clubId: string;
  clubLocationId?: string | null;
  bayId?: string | null;
  preferredDate: Date;
  preferredTimeStart: string;
  preferredTimeEnd?: string | null;
  numberOfPlayers: number;
  guestNames: string;
  notes: string;
  status?: Booking["status"];
  staffMemberId?: string | null;
  cancelledAt?: Date | null;
  notify?: boolean;
  now?: Date;
};

const BOOKING_REFERENCE_PREFIX = "TT-";
const BOOKING_REFERENCE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateBookingReference = () => {
  const bytes = randomBytes(6);
  let token = "";
  for (const byte of bytes) {
    token += BOOKING_REFERENCE_CHARS[byte % BOOKING_REFERENCE_CHARS.length];
  }
  return `${BOOKING_REFERENCE_PREFIX}${token}`;
};

const isBookingReferenceConflict = (error: unknown) => {
  const err = error as { code?: string; constraint?: string };
  if (err?.code !== "23505") {
    return false;
  }
  if (!err.constraint) {
    return true;
  }
  return err.constraint === "bookings_booking_reference_idx";
};

export const createBookingWithHistory = async (
  db: Database,
  params: CreateBookingParams
) => {
  const now = params.now ?? new Date();
  const minLeadMinutes = Number.parseInt(
    process.env.BOOKING_MIN_LEAD_MINUTES ?? "0",
    10
  );
  const leadMinutes = Number.isFinite(minLeadMinutes) ? minLeadMinutes : 0;
  
  // Get date parts in local timezone to avoid UTC conversion issues
  const year = params.preferredDate.getFullYear();
  const month = params.preferredDate.getMonth();
  const day = params.preferredDate.getDate();
  
  // Parse time (HH:MM or HH:MM:SS)
  const timeParts = params.preferredTimeStart.split(":").map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const seconds = timeParts[2] ?? 0;
  
  // Create booking datetime in local timezone
  const bookingDateTime = new Date(year, month, day, hours, minutes, seconds);
  
  if (!Number.isNaN(bookingDateTime.getTime())) {
    const nowTime = now.getTime();
    if (bookingDateTime.getTime() < nowTime) {
      throw new Error("booking_in_past");
    }
    const cutoff = nowTime + Math.max(leadMinutes, 0) * 60 * 1000;
    if (leadMinutes > 0 && bookingDateTime.getTime() < cutoff) {
      throw new Error("booking_too_soon");
    }
  }
  let booking: Booking | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bookingReference = generateBookingReference();
    try {
      booking = await db.transaction(async (tx) => {
        const bookingRepo = createBookingRepository(tx);
        const historyRepo = createBookingStatusHistoryRepository(tx);
        const bayRepo = createClubLocationBayRepository(tx);
        const initialStatus = params.status ?? "Pending";

        let bayId = params.bayId ?? undefined;
        if (bayId) {
          const reserved = await bayRepo.reserve(bayId, now);
          if (!reserved) {
            throw new Error("bay_unavailable");
          }
        } else if (params.clubLocationId) {
          const available = await bayRepo.listByLocationId(params.clubLocationId, {
            status: "available",
          });
          if (available.length === 0) {
            throw new Error("bay_unavailable");
          }
          const reserved = await bayRepo.reserve(available[0].id, now);
          if (!reserved) {
            throw new Error("bay_unavailable");
          }
          bayId = reserved.id;
        }

        const booking = await bookingRepo.create({
          memberId: params.memberId,
          clubId: params.clubId,
          clubLocationId: params.clubLocationId ?? null,
          bayId: bayId ?? null,
          preferredDate: params.preferredDate,
          preferredTimeStart: params.preferredTimeStart,
          preferredTimeEnd: params.preferredTimeEnd ?? null,
          bookingReference,
          numberOfPlayers: params.numberOfPlayers,
          guestNames: params.guestNames,
          notes: params.notes,
          status: initialStatus,
          staffMemberId: params.staffMemberId ?? null,
          cancelledAt: params.cancelledAt ?? null,
          createdAt: now,
          updatedAt: now,
        });

        await historyRepo.create({
          bookingId: booking.id,
          previousStatus: initialStatus,
          nextStatus: initialStatus,
          changedByStaffId: params.staffMemberId ?? null,
          reason: null,
          createdAt: now,
        });

        return booking;
      });
      break;
    } catch (error) {
      if (isBookingReferenceConflict(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (!booking) {
    throw (lastError as Error) ?? new Error("booking_reference_generation_failed");
  }

  logger.info("core.booking.create", {
    bookingId: booking.id,
    memberId: booking.memberId,
  });

  if (params.notify) {
    const dashboardUrl =
      process.env.ADMIN_DASHBOARD_URL ?? "http://localhost:5173";
    const bookingLink = `${dashboardUrl}/bookings/${booking.id}`;
    const preferredDate =
      typeof booking.preferredDate === "object" &&
      booking.preferredDate !== null &&
      "toISOString" in booking.preferredDate
        ? (booking.preferredDate as Date).toISOString().slice(0, 10)
        : String(booking.preferredDate);
    const notificationText =
      `New booking request (${booking.status}).\n` +
      `Member: ${booking.memberId}\n` +
      `Date: ${preferredDate}\n` +
      `Time: ${booking.preferredTimeStart}\n` +
      `Players: ${params.numberOfPlayers}\n` +
      `Notes: ${params.notes || "None"}\n` +
      `Review: ${bookingLink}`;
    await notifyBooking({ text: notificationText });
  }

  return booking;
};
