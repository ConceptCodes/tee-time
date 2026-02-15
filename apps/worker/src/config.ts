import { env } from "@tee-time/config";

export const config = {
  worker: {
    scheduledIntervalMs: env.WORKER_SCHEDULED_INTERVAL_MS,
    reportsIntervalMs: env.WORKER_REPORTS_INTERVAL_MS,
    jobBatchSize: env.WORKER_JOB_BATCH_SIZE,
    retentionIntervalMs: env.WORKER_RETENTION_INTERVAL_MS,
    staleProcessingMinutes: env.WORKER_STALE_PROCESSING_MINUTES,
    webhookDlqIntervalMs: env.WORKER_WEBHOOK_DLQ_INTERVAL_MS,
    webhookDlqBatchSize: env.WORKER_WEBHOOK_DLQ_BATCH_SIZE,
  },
  retry: {
    maxAttempts: env.WORKER_MAX_ATTEMPTS,
    baseDelayMs: env.WORKER_RETRY_BASE_DELAY_MS,
    backoffMultiplier: env.WORKER_RETRY_BACKOFF_MULTIPLIER,
    maxDelayMs: env.WORKER_RETRY_MAX_DELAY_MS,
  },
};
