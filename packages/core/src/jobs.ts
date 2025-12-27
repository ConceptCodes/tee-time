import type { Database, ScheduledJob } from "@tee-time/database";
import { logger } from "./logger";

export type JobRunnerContext = {
  db: Database;
};

export const ScheduledJobStatus = {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed"
} as const;

export type ScheduledJobStatus =
  (typeof ScheduledJobStatus)[keyof typeof ScheduledJobStatus];

const handleReminderJob = async (job: ScheduledJob, _context: JobRunnerContext) => {
  logger.info("Scheduled reminder job handled", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType
  });
};

const handleFollowUpJob = async (job: ScheduledJob, _context: JobRunnerContext) => {
  logger.info("Scheduled follow-up job handled", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType
  });
};

const handleRetentionJob = async (job: ScheduledJob, _context: JobRunnerContext) => {
  logger.info("Scheduled retention job handled", {
    service: "worker",
    jobId: job.id,
    jobType: job.jobType
  });
};

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

export const runReportGeneration = async (_context: JobRunnerContext) => {
  logger.info("Report generation tick", { service: "worker", job: "reports" });
};
