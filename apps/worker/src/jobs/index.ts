import { sql } from "drizzle-orm";
import { createHmac } from "node:crypto";
import {
  createScheduledJobRepository,
  createWebhookDlqRepository,
  type Database,
  type ScheduledJob,
  type WebhookDlqEvent,
} from "@tee-time/database";
import {
  logger,
  runReportGeneration,
  runScheduledJob,
  ScheduledJobStatus,
  type JobRunnerContext,
  getErrorMessage
} from "@tee-time/core";
import { config } from "../config";


const computeRetryDelay = (attempts: number, policy: typeof config.retry) => {
  const exponent = Math.max(attempts - 1, 0);
  const delay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, exponent);
  return Math.min(delay, policy.maxDelayMs);
};

const claimDueScheduledJobs = async (
  db: Database,
  limit: number,
  staleProcessingMinutes: number
) => {
  const result = await db.execute(sql`
    update scheduled_jobs
    set status = ${ScheduledJobStatus.processing},
        attempts = attempts + 1,
        updated_at = now(),
        last_error = null
    where id in (
      select id
      from scheduled_jobs
      where (
        status = ${ScheduledJobStatus.pending}
        and run_at <= now()
      )
      or (
        status = ${ScheduledJobStatus.processing}
        and updated_at <= now() - make_interval(mins => ${staleProcessingMinutes})
      )
      order by run_at asc
      limit ${limit}
      for update skip locked
    )
    returning *
  `);
  return result.rows as ScheduledJob[];
};

export const runScheduledJobs = async ({ db }: JobRunnerContext) => {
  const batchSize = config.worker.jobBatchSize;
  const jobs = await claimDueScheduledJobs(
    db,
    batchSize,
    config.worker.staleProcessingMinutes
  );
  if (jobs.length === 0) return;

  const repository = createScheduledJobRepository(db);
  const retryPolicy = config.retry;

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
      const message = getErrorMessage(error, "Unknown error occurred");
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

const resolveReplayUrl = (eventType: string) => {
  const base = process.env.VITE_API_BASE_URL;
  if (!base) {
    throw new Error("VITE_API_BASE_URL is required for webhook DLQ replay");
  }
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (eventType === "whatsapp_inbound") {
    return `${normalizedBase}/webhooks/whatsapp`;
  }
  if (eventType === "whatsapp_status") {
    return `${normalizedBase}/webhooks/whatsapp/status`;
  }
  throw new Error(`unsupported_dlq_event_type:${eventType}`);
};

const toFormPayload = (payload: unknown): Record<string, string> => {
  if (!payload || typeof payload !== "object") {
    throw new Error("invalid_dlq_payload");
  }
  const pairs = Object.entries(payload as Record<string, unknown>);
  const result: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (value === null || value === undefined) continue;
    result[key] = String(value);
  }
  result.ReplaySource = "dlq";
  return result;
};

const replayWebhookEvent = async (event: WebhookDlqEvent) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is required for webhook DLQ replay");
  }

  const url = resolveReplayUrl(event.eventType);
  const payload = toFormPayload(event.payload);
  const signature = getReplayTwilioSignature(authToken, url, payload);
  const body = new URLSearchParams(payload).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signature,
      "X-DLQ-Replay": "1",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`dlq_replay_http_${response.status}`);
  }
};

const getReplayTwilioSignature = (
  authToken: string,
  url: string,
  params: Record<string, string>
) => {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => `${acc}${key}${params[key]}`, url);
  return createHmac("sha1", authToken).update(data, "utf-8").digest("base64");
};

export const runWebhookDlqReplay = async ({ db }: JobRunnerContext) => {
  const repo = createWebhookDlqRepository(db);
  const limit = config.worker.webhookDlqBatchSize;
  const events = await repo.claimDuePending(
    limit,
    new Date(),
    config.worker.staleProcessingMinutes
  );
  if (events.length === 0) return;

  const retryPolicy = config.retry;
  for (const event of events) {
    try {
      await replayWebhookEvent(event);
      await repo.update(event.id, {
        status: "resolved",
        lastError: null,
        updatedAt: new Date(),
      });
      logger.info("DLQ webhook replay resolved", {
        service: "worker",
        dlqId: event.id,
        eventType: event.eventType,
      });
    } catch (error) {
      const message = getErrorMessage(error, "unknown_dlq_replay_error");
      const attempts = Number(event.attempts ?? 1);
      if (attempts >= retryPolicy.maxAttempts) {
        await repo.update(event.id, {
          status: "failed",
          lastError: message,
          updatedAt: new Date(),
        });
        logger.error("DLQ webhook replay permanently failed", {
          service: "worker",
          dlqId: event.id,
          eventType: event.eventType,
          attempts,
          error: message,
        });
        continue;
      }

      const delayMs = computeRetryDelay(attempts, retryPolicy);
      await repo.update(event.id, {
        status: "pending",
        lastError: message,
        nextRetryAt: new Date(Date.now() + delayMs),
        updatedAt: new Date(),
      });
      logger.warn("DLQ webhook replay rescheduled", {
        service: "worker",
        dlqId: event.id,
        eventType: event.eventType,
        attempts,
        delayMs,
        error: message,
      });
    }
  }
};
