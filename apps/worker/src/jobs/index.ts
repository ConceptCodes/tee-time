import { sql } from "drizzle-orm";
import {
  createScheduledJobRepository,
  type Database,
  type ScheduledJob
} from "@tee-time/database";
import {
  logger,
  runReportGeneration,
  runScheduledJob,
  ScheduledJobStatus,
  type JobRunnerContext
} from "@tee-time/core";

type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
};

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatValue = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRetryPolicy = (): RetryPolicy => ({
  maxAttempts: parseInteger(process.env.WORKER_MAX_ATTEMPTS, 5),
  baseDelayMs: parseInteger(process.env.WORKER_RETRY_BASE_DELAY_MS, 60000),
  backoffMultiplier: parseFloatValue(process.env.WORKER_RETRY_BACKOFF_MULTIPLIER, 2),
  maxDelayMs: parseInteger(process.env.WORKER_RETRY_MAX_DELAY_MS, 3600000)
});

const computeRetryDelay = (attempts: number, policy: RetryPolicy) => {
  const exponent = Math.max(attempts - 1, 0);
  const delay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, exponent);
  return Math.min(delay, policy.maxDelayMs);
};

const claimDueScheduledJobs = async (db: Database, limit: number) => {
  const result = await db.execute(sql`
    update scheduled_jobs
    set status = ${ScheduledJobStatus.processing},
        attempts = attempts + 1,
        updated_at = now(),
        last_error = null
    where id in (
      select id
      from scheduled_jobs
      where status = ${ScheduledJobStatus.pending}
        and run_at <= now()
      order by run_at asc
      limit ${limit}
      for update skip locked
    )
    returning *
  `);
  return result.rows as ScheduledJob[];
};

export const runScheduledJobs = async ({ db }: JobRunnerContext) => {
  const batchSize = parseInteger(process.env.WORKER_JOB_BATCH_SIZE, 25);
  const jobs = await claimDueScheduledJobs(db, batchSize);
  if (jobs.length === 0) return;

  const repository = createScheduledJobRepository(db);
  const retryPolicy = getRetryPolicy();

  for (const job of jobs) {
    try {
      await runScheduledJob(job, { db });
      await repository.update(job.id, {
        status: ScheduledJobStatus.completed,
        lastError: null,
        updatedAt: new Date()
      });
      logger.info("Scheduled job completed", {
        service: "worker",
        jobId: job.id,
        jobType: job.jobType
      });
    } catch (error) {
      const message = (error as Error).message;
      const nextAttempt = job.attempts ?? 0;
      if (nextAttempt >= retryPolicy.maxAttempts) {
        await repository.update(job.id, {
          status: ScheduledJobStatus.failed,
          lastError: message,
          updatedAt: new Date()
        });
        logger.error("Scheduled job failed permanently", {
          service: "worker",
          jobId: job.id,
          jobType: job.jobType,
          attempts: nextAttempt,
          error: message
        });
        continue;
      }

      const delayMs = computeRetryDelay(nextAttempt, retryPolicy);
      const nextRunAt = new Date(Date.now() + delayMs);
      await repository.update(job.id, {
        status: ScheduledJobStatus.pending,
        lastError: message,
        runAt: nextRunAt,
        updatedAt: new Date()
      });
      logger.warn("Scheduled job rescheduled after failure", {
        service: "worker",
        jobId: job.id,
        jobType: job.jobType,
        attempts: nextAttempt,
        delayMs,
        error: message
      });
    }
  }
};

export const runReports = async (context: JobRunnerContext) => {
  await runReportGeneration(context);
};
