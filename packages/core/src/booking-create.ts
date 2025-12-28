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
  const dateIso = params.preferredDate.toISOString().slice(0, 10);
  const timeToken = params.preferredTimeStart.length === 5
    ? `${params.preferredTimeStart}:00`
    : params.preferredTimeStart;
  const bookingDateTime = new Date(`${dateIso}T${timeToken}`);
  if (!Number.isNaN(bookingDateTime.getTime())) {
    const cutoff = now.getTime() + Math.max(leadMinutes, 0) * 60 * 1000;
    if (bookingDateTime.getTime() < cutoff) {
      throw new Error("booking_in_past");
    }
  }
  const booking = await db.transaction(async (tx) => {
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

  logger.info("core.booking.create", {
    bookingId: booking.id,
    memberId: booking.memberId,
  });

  if (params.notify) {
    const dashboardUrl =
      process.env.ADMIN_DASHBOARD_URL ?? "http://localhost:5173";
    const bookingLink = `${dashboardUrl}/bookings/${booking.id}`;
    const notificationText =
      `New booking request (${booking.status}).\n` +
      `Member: ${booking.memberId}\n` +
      `Date: ${booking.preferredDate.toISOString().slice(0, 10)}\n` +
      `Time: ${booking.preferredTimeStart}\n` +
      `Players: ${params.numberOfPlayers}\n` +
      `Notes: ${params.notes || "None"}\n` +
      `Review: ${bookingLink}`;
    await notifyBooking({ text: notificationText });
  }

  return booking;
};
