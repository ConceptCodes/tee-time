import type {
  Booking,
  BookingStatusHistory,
  Database,
  NewBookingStatusHistory
} from "@tee-time/database";
import {
  createAuditLogRepository,
  createBookingRepository,
  createBookingStatusHistoryRepository
} from "@tee-time/database";
import { logger } from "./logger";

const DEFAULT_CANCELLATION_WINDOW_MINUTES = 60;

const parseCancellationWindowMinutes = () => {
  const parsed = Number.parseInt(
    process.env.CANCELLATION_WINDOW_MINUTES ??
      String(DEFAULT_CANCELLATION_WINDOW_MINUTES),
    10
  );
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CANCELLATION_WINDOW_MINUTES;
};

const parseBookingDateTime = (
  preferredDate: Date | string,
  preferredTimeStart: string | null | undefined
) => {
  if (!preferredTimeStart) {
    return null;
  }
  const dateString =
    preferredDate instanceof Date
      ? preferredDate.toISOString().slice(0, 10)
      : preferredDate;
  if (!dateString) {
    return null;
  }
  const timeString =
    preferredTimeStart.length === 5
      ? `${preferredTimeStart}:00`
      : preferredTimeStart;
  const parsed = new Date(`${dateString}T${timeString}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export type SetBookingStatusParams = {
  bookingId: string;
  nextStatus: Booking["status"];
  changedByStaffId?: string | null;
  reason?: string | null;
  audit?: {
    actorId?: string | null;
    action: string;
    metadata?: Record<string, unknown> | null;
  };
  now?: Date;
};

export const setBookingStatusWithHistory = async (
  db: Database,
  params: SetBookingStatusParams
) => {
  const now = params.now ?? new Date();
  logger.info("core.bookingStatus.start", {
    bookingId: params.bookingId,
    nextStatus: params.nextStatus,
    actorId: params.changedByStaffId ?? null
  });
  return db.transaction(async (tx) => {
    const bookingRepo = createBookingRepository(tx);
    const historyRepo = createBookingStatusHistoryRepository(tx);
    const auditRepo = createAuditLogRepository(tx);

    const current = await bookingRepo.getById(params.bookingId);
    if (!current) {
      logger.warn("core.bookingStatus.notFound", { bookingId: params.bookingId });
      return { booking: null, history: null };
    }

    if (params.nextStatus === "Cancelled") {
      const windowMinutes = parseCancellationWindowMinutes();
      const bookingDateTime = parseBookingDateTime(
        current.preferredDate,
        current.preferredTimeStart
      );
      if (bookingDateTime) {
        const cutoff =
          bookingDateTime.getTime() - windowMinutes * 60 * 1000;
        if (now.getTime() > cutoff) {
          logger.warn("core.bookingStatus.cancelWindowExceeded", {
            bookingId: params.bookingId,
            windowMinutes,
            bookingDateTime: bookingDateTime.toISOString()
          });
          throw new Error("cancellation_window_exceeded");
        }
      } else {
        logger.warn("core.bookingStatus.cancelWindowSkipped", {
          bookingId: params.bookingId
        });
      }
    }

    const updated = await bookingRepo.updateStatus({
      id: params.bookingId,
      status: params.nextStatus,
      staffMemberId: params.changedByStaffId ?? current.staffMemberId,
      updatedAt: now
    });

    const history = await historyRepo.create({
      bookingId: params.bookingId,
      previousStatus: current.status,
      nextStatus: params.nextStatus,
      changedByStaffId: params.changedByStaffId ?? null,
      reason: params.reason ?? null,
      createdAt: now
    } as NewBookingStatusHistory);

    if (params.audit) {
      await auditRepo.create({
        actorId: params.audit.actorId ?? null,
        action: params.audit.action,
        resourceType: "booking",
        resourceId: params.bookingId,
        metadata: params.audit.metadata ?? {},
        createdAt: now
      });
    }

    logger.info("core.bookingStatus.success", {
      bookingId: params.bookingId,
      previousStatus: current.status,
      nextStatus: params.nextStatus
    });
    return {
      booking: updated as Booking | null,
      history: history as BookingStatusHistory | null
    };
  });
};
