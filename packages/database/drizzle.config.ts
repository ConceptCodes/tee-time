import { defineConfig } from "drizzle-kit";
import { config } from "@dotenvx/dotenvx";
import path from "node:path";

config({ path: path.join(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  tablesFilter: [
    "clubs",
    "club_locations",
    "club_location_bays",
    "member_profiles",
    "staff_users",
    "bookings",
    "booking_states",
    "booking_status_history",
    "faq_entries",
    "messages",
    "notifications",
    "scheduled_jobs",
    "audit_logs",
    "support_requests",
    "teams",
    "team_memberships"
  ],
  extensionsFilters: ["postgis"],
});
