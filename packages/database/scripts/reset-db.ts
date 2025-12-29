import { getDb } from "../src/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("🧹 Resetting database...");

  try {
    // Drop and recreate public schema to wipe everything including enums and extensions
    // This allows migrations to run from scratch without "type already exists" errors
    await db.execute(sql.raw(`DROP SCHEMA IF EXISTS public CASCADE`));
    await db.execute(sql.raw(`CREATE SCHEMA public`));
    await db.execute(sql.raw(`GRANT ALL ON SCHEMA public TO public`));
    await db.execute(sql.raw(`COMMENT ON SCHEMA public IS 'standard public schema'`));
    
    console.log("  - Dropped and recreated 'public' schema");
  } catch (e) {
    console.error("  ❌ Error reseting schema:", e);
    process.exit(1);
  }

  console.log("✅ Database reset complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
