export const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseFloatValue = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  worker: {
    scheduledIntervalMs: parseInteger(process.env.WORKER_SCHEDULED_INTERVAL_MS, 60000),
    reportsIntervalMs: parseInteger(process.env.WORKER_REPORTS_INTERVAL_MS, 3600000),
    jobBatchSize: parseInteger(process.env.WORKER_JOB_BATCH_SIZE, 25),
    retentionIntervalMs: parseInteger(process.env.WORKER_RETENTION_INTERVAL_MS, 86400000),
  },
  retry: {
    maxAttempts: parseInteger(process.env.WORKER_MAX_ATTEMPTS, 5),
    baseDelayMs: parseInteger(process.env.WORKER_RETRY_BASE_DELAY_MS, 60000),
    backoffMultiplier: parseFloatValue(process.env.WORKER_RETRY_BACKOFF_MULTIPLIER, 2),
    maxDelayMs: parseInteger(process.env.WORKER_RETRY_MAX_DELAY_MS, 3600000),
  },
};
