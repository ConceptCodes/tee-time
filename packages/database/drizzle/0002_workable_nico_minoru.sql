ALTER TYPE "public"."staff_role" ADD VALUE 'staff' BEFORE 'member';--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;