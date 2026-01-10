import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: Database | null = null;

export const createDb = (connectionString?: string): Database => {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to create the database client.");
  }
  pool = new Pool({ connectionString: url });
  db = drizzle(pool, { schema });
  return db;
};

export const getDb = (): Database => {
  if (!db) {
    return createDb();
  }
  return db;
};

export const closeDb = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
};

const handleShutdown = async () => {
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
