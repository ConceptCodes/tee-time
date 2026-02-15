import { z } from "zod";

const configSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  FAQ_EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  // Auth
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),
  ADMIN_APP_ORIGIN: z.string().url().default("http://localhost:5173"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_REDACT: z.coerce.boolean().default(true),

  // AI
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_MODEL_ID: z.string().default("google/gemini-3-flash-preview"),
  OPENROUTER_EMBEDDING_MODEL_ID: z
    .string()
    .default("openai/text-embedding-3-small"),

  // App / API
  VITE_MAX_PLAYERS: z.coerce.number().default(6),
  VITE_API_BASE_URL: z.string().url().default("http://localhost:3000"),

  // Booking Logic
  BOOKING_MAX_PLAYERS: z.coerce.number().default(6),
  BOOKING_STATE_TTL_MINUTES: z.coerce.number().default(10080),
  BOOKING_MIN_LEAD_MINUTES: z.coerce.number().default(0),
  BOOKING_BAY_PROMPT_LIMIT: z.coerce.number().default(8),

  // Slack
  SLACK_BOT_TOKEN: z.string(),
  SUPPORT_SLACK_UPDATES_CHANNEL: z.string().default("#support"),
  SUPPORT_SLACK_USERNAMES: z
    .string()
    .default("alice,bob")
    .transform((s) => s.split(",")),
  BOOKING_SLACK_UPDATES_CHANNEL: z.string().default("#bookings"),
  BOOKING_SLACK_USERNAMES: z
    .string()
    .default("alice,bob")
    .transform((s) => s.split(",")),

  // Demo
  DEMO_PASSWORD: z.string().optional(),

  // Worker
  WORKER_SCHEDULED_INTERVAL_MS: z.coerce.number().default(60000), // 1 minute
  WORKER_REPORTS_INTERVAL_MS: z.coerce.number().default(3600000), // 1 hour
  WORKER_RETENTION_INTERVAL_MS: z.coerce.number().default(86400000), // 1 day
  WORKER_STALE_PROCESSING_MINUTES: z.coerce.number().default(15),
  WORKER_STALE_NOTIFICATION_MINUTES: z.coerce.number().default(15),
  WORKER_WEBHOOK_DLQ_INTERVAL_MS: z.coerce.number().default(60000), // 1 minute
  WORKER_WEBHOOK_DLQ_BATCH_SIZE: z.coerce.number().default(25),
  WORKER_JOB_BATCH_SIZE: z.coerce.number().default(25),
  WORKER_MAX_ATTEMPTS: z.coerce.number().default(5),
  WORKER_RETRY_BASE_DELAY_MS: z.coerce.number().default(60000), // 1 minute
  WORKER_RETRY_BACKOFF_MULTIPLIER: z.coerce.number().default(2),
  WORKER_RETRY_MAX_DELAY_MS: z.coerce.number().default(3600000), // 1 hour
});

export type Config = z.infer<typeof configSchema>;

export const env = configSchema.parse(
  typeof process !== "undefined"
    ? process.env
    : (globalThis as any).Bun?.env || {},
);
