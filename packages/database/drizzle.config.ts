import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  tablesFilter: [
    "users",
    "sessions",
    "accounts",
    "verifications",
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
