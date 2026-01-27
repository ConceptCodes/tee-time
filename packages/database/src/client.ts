import {
  drizzle as drizzleNode,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
import { env } from "@tee-time/config";
import * as schema from "./schema";

export type Database =
  | NodePgDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

let pool: Pool | null = null;
let db: Database | null = null;
let pgliteInstance: PGlite | null = null;

export const createDb = (connectionString?: string): Database => {
  const url = connectionString ?? env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to create the database client.");
  }
  pool = new Pool({ connectionString: url });
  db = drizzleNode(pool, { schema });
  return db;
};

export const createTestDb = (instance: PGlite): Database => {
  pgliteInstance = instance;
  db = drizzlePglite(instance, { schema }) as unknown as Database;
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
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  db = null;
};

const handleShutdown = async () => {
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
