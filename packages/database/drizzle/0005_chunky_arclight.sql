ALTER TABLE "bookings" ADD COLUMN "booking_reference" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_booking_reference_idx" ON "bookings" USING btree ("booking_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "club_location_bays_location_name_idx" ON "club_location_bays" USING btree ("club_location_id","name");