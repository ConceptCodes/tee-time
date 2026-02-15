CREATE TABLE "rate_limit_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"identifier" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_seconds" smallint NOT NULL,
	"count" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_dlq" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_counters_scope_identifier_window_idx" ON "rate_limit_counters" USING btree ("scope","identifier","window_start");
--> statement-breakpoint
CREATE INDEX "rate_limit_counters_scope_window_idx" ON "rate_limit_counters" USING btree ("scope","window_start");
--> statement-breakpoint
CREATE INDEX "webhook_dlq_status_next_retry_idx" ON "webhook_dlq" USING btree ("status","next_retry_at");
--> statement-breakpoint
CREATE INDEX "webhook_dlq_provider_event_idx" ON "webhook_dlq" USING btree ("provider","event_type");
