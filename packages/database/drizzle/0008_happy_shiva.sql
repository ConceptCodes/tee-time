ALTER TABLE "clubs" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "slack_channel" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_staff_user_id_unique" UNIQUE("team_id","staff_user_id");