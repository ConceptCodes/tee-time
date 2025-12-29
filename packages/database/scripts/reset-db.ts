import { getDb } from "../src/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("🧹 Resetting database...");

  const tables = [
    "audit_logs",
    "booking_status_history",
    "notifications",
    "scheduled_jobs",
    "bookings",
    "club_location_bays",
    "club_locations",
    "clubs",
    "faq_entries",
    "message_dedup",
    "message_logs",
    "support_requests",
    "team_memberships",
    "teams",
    "booking_states",
    "member_profiles",
    "sessions",
    "accounts",
    "verifications",
    "users",
    "staff_users"
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
      console.log(`  - Truncated ${table}`);
    } catch (e) {
      console.log(`  - Table ${table} not found or error, skipping...`);
    }
  }

  console.log("✅ Database reset complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
