CREATE TYPE "public"."bay_status" AS ENUM('available', 'booked', 'maintenance');--> statement-breakpoint
CREATE TABLE "club_location_bays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "bay_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "bay_id" uuid;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "preferred_location_label" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "preferred_time_of_day" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "preferred_bay_label" text;--> statement-breakpoint
ALTER TABLE "club_location_bays" ADD CONSTRAINT "club_location_bays_club_location_id_club_locations_id_fk" FOREIGN KEY ("club_location_id") REFERENCES "public"."club_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_location_bays_location_id_idx" ON "club_location_bays" USING btree ("club_location_id");--> statement-breakpoint
CREATE INDEX "club_location_bays_location_status_idx" ON "club_location_bays" USING btree ("club_location_id","status");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bay_id_club_location_bays_id_fk" FOREIGN KEY ("bay_id") REFERENCES "public"."club_location_bays"("id") ON DELETE no action ON UPDATE no action;