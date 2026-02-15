import { and, eq, lt, sql } from "drizzle-orm";
import { type Database } from "../client";
import { rateLimitCounters } from "../schema";

export type RateLimitCounter = typeof rateLimitCounters.$inferSelect;
export type NewRateLimitCounter = typeof rateLimitCounters.$inferInsert;

const getWindowStart = (now: Date, windowSeconds: number) => {
  const windowMs = windowSeconds * 1000;
  const bucketStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
  return new Date(bucketStartMs);
};

export const createRateLimitCounterRepository = (db: Database) => ({
  consume: async (params: {
    scope: string;
    identifier: string;
    windowSeconds: number;
    now?: Date;
  }) => {
    const now = params.now ?? new Date();
    const windowStart = getWindowStart(now, params.windowSeconds);

    const rows = await db
      .insert(rateLimitCounters)
      .values({
        scope: params.scope,
        identifier: params.identifier,
        windowStart,
        windowSeconds: params.windowSeconds,
        count: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          rateLimitCounters.scope,
          rateLimitCounters.identifier,
          rateLimitCounters.windowStart,
        ],
        set: {
          count: sql`${rateLimitCounters.count} + 1`,
          updatedAt: now,
        },
      })
      .returning({
        count: rateLimitCounters.count,
        windowStart: rateLimitCounters.windowStart,
        windowSeconds: rateLimitCounters.windowSeconds,
      });

    return rows[0] ?? null;
  },
  deleteBefore: async (cutoff: Date): Promise<number> => {
    const rows = await db
      .delete(rateLimitCounters)
      .where(lt(rateLimitCounters.windowStart, cutoff))
      .returning({ id: rateLimitCounters.id });
    return rows.length;
  },
  getCurrent: async (params: {
    scope: string;
    identifier: string;
    windowSeconds: number;
    now?: Date;
  }) => {
    const now = params.now ?? new Date();
    const windowStart = getWindowStart(now, params.windowSeconds);
    const rows = await db
      .select()
      .from(rateLimitCounters)
      .where(
        and(
          eq(rateLimitCounters.scope, params.scope),
          eq(rateLimitCounters.identifier, params.identifier),
          eq(rateLimitCounters.windowStart, windowStart)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },
});
