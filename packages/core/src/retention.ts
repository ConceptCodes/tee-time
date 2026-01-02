import { and, inArray, lt } from "drizzle-orm";
import {
  auditLogs,
  bookingStates,
  bookingStatusHistory,
  bookings,
  messageDedup,
  messageLogs,
  notifications,
  scheduledJobs,
  type Database
} from "@tee-time/database";
import { logger } from "./logger";
import { ScheduledJobStatus } from "./jobs";

const DEFAULT_RETENTION_DAYS = 90;

export const parseRetentionDays = () => {
  const raw = process.env.RETENTION_DAYS;
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS;
  if (parsed <= 0) return null;
  return parsed;
};

export const getRetentionCutoff = (
  now = new Date(),
  retentionDays = parseRetentionDays()
) => {
  if (!retentionDays) return null;
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
};

export type RetentionCleanupResult = {
  retentionDays: number | null;
  cutoff: Date | null;
  messageLogs: number;
  auditLogs: number;
  notifications: number;
  bookingStatusHistory: number;
  bookings: number;
  bookingStates: number;
  scheduledJobs: number;
  messageDedupExpired: number;
};

export const runRetentionCleanup = async (
  db: Database,
  options?: { retentionDays?: number | null; now?: Date }
): Promise<RetentionCleanupResult> => {
  const now = options?.now ?? new Date();
  const retentionDays = options?.retentionDays ?? parseRetentionDays();
  const cutoff = getRetentionCutoff(now, retentionDays);

  if (!cutoff) {
    logger.info("core.retention.skip", { retentionDays });
    return {
      retentionDays,
      cutoff: null,
      messageLogs: 0,
      auditLogs: 0,
      notifications: 0,
      bookingStatusHistory: 0,
      bookings: 0,
      bookingStates: 0,
      scheduledJobs: 0,
      messageDedupExpired: 0
    };
  }

  const messageDedupExpired = (
    await db
      .delete(messageDedup)
      .where(lt(messageDedup.expiresAt, now))
      .returning({ id: messageDedup.id })
  ).length;

  const notificationsDeleted = (
    await db
      .delete(notifications)
      .where(lt(notifications.createdAt, cutoff))
      .returning({ id: notifications.id })
  ).length;

  const scheduledJobsDeleted = (
    await db
      .delete(scheduledJobs)
      .where(
        and(
          lt(scheduledJobs.createdAt, cutoff),
          inArray(scheduledJobs.status, [
            ScheduledJobStatus.completed,
            ScheduledJobStatus.failed
          ])
        )
      )
      .returning({ id: scheduledJobs.id })
  ).length;

  const bookingHistoryDeleted = (
    await db
      .delete(bookingStatusHistory)
      .where(lt(bookingStatusHistory.createdAt, cutoff))
      .returning({ id: bookingStatusHistory.id })
  ).length;

  const bookingsDeleted = (
    await db
      .delete(bookings)
      .where(lt(bookings.createdAt, cutoff))
      .returning({ id: bookings.id })
  ).length;

  const bookingStatesDeleted = (
    await db
      .delete(bookingStates)
      .where(lt(bookingStates.updatedAt, cutoff))
      .returning({ id: bookingStates.id })
  ).length;

  const messageLogsDeleted = (
    await db
      .delete(messageLogs)
      .where(lt(messageLogs.createdAt, cutoff))
      .returning({ id: messageLogs.id })
  ).length;

  const auditLogsDeleted = (
    await db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoff))
      .returning({ id: auditLogs.id })
  ).length;

  logger.info("core.retention.complete", {
    retentionDays,
    cutoff: cutoff.toISOString(),
    messageLogs: messageLogsDeleted,
    auditLogs: auditLogsDeleted,
    notifications: notificationsDeleted,
    bookingStatusHistory: bookingHistoryDeleted,
    bookings: bookingsDeleted,
    bookingStates: bookingStatesDeleted,
    scheduledJobs: scheduledJobsDeleted,
    messageDedupExpired
  });

  return {
    retentionDays,
    cutoff,
    messageLogs: messageLogsDeleted,
    auditLogs: auditLogsDeleted,
    notifications: notificationsDeleted,
    bookingStatusHistory: bookingHistoryDeleted,
    bookings: bookingsDeleted,
    bookingStates: bookingStatesDeleted,
    scheduledJobs: scheduledJobsDeleted,
    messageDedupExpired
  };
};
