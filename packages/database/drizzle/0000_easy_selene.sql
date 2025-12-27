CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('Pending', 'Confirmed', 'Not Available', 'Cancelled', 'Follow-up required');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('reminder', 'follow_up', 'retention');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('whatsapp', 'slack', 'email');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"previous_status" "booking_status" NOT NULL,
	"next_status" "booking_status" NOT NULL,
	"changed_by_staff_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"club_location_id" uuid,
	"preferred_date" date NOT NULL,
	"preferred_time_start" time NOT NULL,
	"preferred_time_end" time,
	"number_of_players" smallint NOT NULL,
	"guest_names" text NOT NULL,
	"notes" text NOT NULL,
	"status" "booking_status" NOT NULL,
	"staff_member_id" uuid,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"location_point" geometry(Point,4326) NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "clubs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "faq_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"tags" jsonb NOT NULL,
	"embedding" vector(1536),
	"embedding_updated_at" timestamp with time zone,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"favorite_location_label" text NOT NULL,
	"favorite_location_point" geometry(Point,4326),
	"membership_id" text NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "member_profiles_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "member_profiles_membership_id_unique" UNIQUE("membership_id")
);
--> statement-breakpoint
CREATE TABLE "message_dedup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"message_hash" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"provider_message_id" text,
	"body_redacted" text NOT NULL,
	"body_hash" text,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"template_name" text NOT NULL,
	"provider_message_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" "job_type" NOT NULL,
	"booking_id" uuid,
	"run_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"attempts" smallint NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "staff_users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_staff_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_staff_id_staff_users_id_fk" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_club_location_id_club_locations_id_fk" FOREIGN KEY ("club_location_id") REFERENCES "public"."club_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_member_id_staff_users_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_locations" ADD CONSTRAINT "club_locations_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_dedup" ADD CONSTRAINT "message_dedup_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_status_preferred_date_idx" ON "bookings" USING btree ("status","preferred_date");--> statement-breakpoint
CREATE INDEX "bookings_member_id_created_at_idx" ON "bookings" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "club_locations_club_id_idx" ON "club_locations" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "club_locations_location_point_gist_idx" ON "club_locations" USING gist ("location_point");--> statement-breakpoint
CREATE INDEX "faq_entries_embedding_idx" ON "faq_entries" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "message_dedup_member_id_message_hash_idx" ON "message_dedup" USING btree ("member_id","message_hash");--> statement-breakpoint
CREATE INDEX "message_logs_member_id_created_at_idx" ON "message_logs" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_booking_id_status_idx" ON "notifications" USING btree ("booking_id","status");
