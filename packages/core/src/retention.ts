import { and, inArray, lt, sql} from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
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
const DEFAULT_BATCH_SIZE = 1000;

export const parseRetentionDays = () => {
  const raw = process.env.RETENTION_DAYS;
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS;
  if (parsed <= 0) return null;
  return parsed;
};

export const parseBatchSize = () => {
  const raw = process.env.RETENTION_BATCH_SIZE;
  if (!raw) return DEFAULT_BATCH_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BATCH_SIZE;
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

/**
 * Delete records in batches to avoid long-running queries and potential timeouts.
 * Returns the total number of records deleted.
 */
const batchDelete = async (
  db: Database,
  table: PgTable,
  idColumn: unknown,
  whereClause: ReturnType<typeof lt> | ReturnType<typeof and>,
  batchSize: number
): Promise<number> => {
  let totalDeleted = 0;
  let deletedInBatch: number;

  do {
    // Use a subquery to select IDs to delete in batches
    const result = await db.execute(sql`
      WITH to_delete AS (
        SELECT ${idColumn} FROM ${table}
        WHERE ${whereClause}
        LIMIT ${batchSize}
      )
      DELETE FROM ${table}
      WHERE ${idColumn} IN (SELECT ${idColumn} FROM to_delete)
      RETURNING ${idColumn}
    `);
    
    deletedInBatch = result.rowCount ?? 0;
    totalDeleted += deletedInBatch;
  } while (deletedInBatch === batchSize);

  return totalDeleted;
};

type CleanupOptions = { 
  retentionDays?: number | null;
  now?: Date;
  batchSize?: number;
};

export const runRetentionCleanup = async (
  db: Database,
  options?: CleanupOptions
): Promise<RetentionCleanupResult> => {
  const now = options?.now ?? new Date();
  const retentionDays = options?.retentionDays ?? parseRetentionDays();
  const batchSize = options?.batchSize ?? parseBatchSize();
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

  logger.info("core.retention.start", {
    retentionDays,
    cutoff: cutoff.toISOString(),
    batchSize
  });

  // Delete expired message dedup entries
  const messageDedupExpired = await batchDelete(
    db,
    messageDedup,
    messageDedup.id,
    lt(messageDedup.expiresAt, now),
    batchSize
  );

  // Delete old notifications
  const notificationsDeleted = await batchDelete(
    db,
    notifications,
    notifications.id,
    lt(notifications.createdAt, cutoff),
    batchSize
  );

  // Delete completed/failed scheduled jobs
  const scheduledJobsDeleted = await batchDelete(
    db,
    scheduledJobs,
    scheduledJobs.id,
    and(
      lt(scheduledJobs.createdAt, cutoff),
      inArray(scheduledJobs.status, [
        ScheduledJobStatus.completed,
        ScheduledJobStatus.failed
      ])
    )!,
    batchSize
  );

  // Delete old booking status history
  const bookingHistoryDeleted = await batchDelete(
    db,
    bookingStatusHistory,
    bookingStatusHistory.id,
    lt(bookingStatusHistory.createdAt, cutoff),
    batchSize
  );

  // Delete old bookings
  const bookingsDeleted = await batchDelete(
    db,
    bookings,
    bookings.id,
    lt(bookings.createdAt, cutoff),
    batchSize
  );

  // Delete old booking states
  const bookingStatesDeleted = await batchDelete(
    db,
    bookingStates,
    bookingStates.id,
    lt(bookingStates.updatedAt, cutoff),
    batchSize
  );

  // Delete old message logs
  const messageLogsDeleted = await batchDelete(
    db,
    messageLogs,
    messageLogs.id,
    lt(messageLogs.createdAt, cutoff),
    batchSize
  );

  // Delete old audit logs
  const auditLogsDeleted = await batchDelete(
    db,
    auditLogs,
    auditLogs.id,
    lt(auditLogs.createdAt, cutoff),
    batchSize
  );

  logger.info("core.retention.complete", {
    retentionDays,
    cutoff: cutoff.toISOString(),
    batchSize,
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
