import type {
  Booking,
  BookingStatusHistory,
  Database,
  NewBookingStatusHistory
} from "@syndicate/database";
import {
  createAuditLogRepository,
  createBookingRepository,
  createBookingStatusHistoryRepository
} from "@syndicate/database";
import { logger } from "./logger";

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
