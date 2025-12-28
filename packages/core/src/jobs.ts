import type { Database, ScheduledJob } from "@tee-time/database";
import { logger } from "./logger";
import { processBookingNotification } from "./notification-queue";

export type JobRunnerContext = {
  db: Database;
};

export const ScheduledJobStatus = {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed",
} as const;

export type ScheduledJobStatus =
  (typeof ScheduledJobStatus)[keyof typeof ScheduledJobStatus];

/**
 * Handle reminder jobs - sends booking reminders to members.
 */
const handleReminderJob = async (
  job: ScheduledJob,
  context: JobRunnerContext
) => {
  logger.info("Scheduled reminder job starting", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType,
    bookingId: job.bookingId,
  });

  if (job.bookingId) {
    // Process any pending notifications for this booking
    await processBookingNotification(context.db, job.bookingId);
  }

  logger.info("Scheduled reminder job completed", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType,
  });
};

/**
 * Handle follow-up jobs - sends post-booking follow-ups to members.
 */
const handleFollowUpJob = async (
  job: ScheduledJob,
  context: JobRunnerContext
) => {
  logger.info("Scheduled follow-up job starting", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType,
    bookingId: job.bookingId,
  });

  if (job.bookingId) {
    // Process any pending notifications for this booking
    await processBookingNotification(context.db, job.bookingId);
  }

  logger.info("Scheduled follow-up job completed", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType,
  });
};

/**
 * Handle retention jobs - re-engages inactive members.
 */
const handleRetentionJob = async (
  job: ScheduledJob,
  _context: JobRunnerContext
) => {
  logger.info("Scheduled retention job handled", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType,
  });
  // TODO: Implement retention logic (e.g., send promotional messages)
};

/**
 * Run the appropriate handler for a scheduled job.
 */
export const runScheduledJob = async (
  job: ScheduledJob,
  context: JobRunnerContext
) => {
  switch (job.jobType) {
    case "reminder":
      return handleReminderJob(job, context);
    case "follow_up":
      return handleFollowUpJob(job, context);
    case "retention":
      return handleRetentionJob(job, context);
    default:
      throw new Error(`Unhandled scheduled job type: ${job.jobType}`);
  }
};

/**
 * Placeholder for report generation task.
 */
export const runReportGeneration = async (_context: JobRunnerContext) => {
  logger.info("Report generation tick", { service: "worker", job: "reports" });
};
