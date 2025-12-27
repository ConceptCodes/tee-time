import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { type Database } from "../client";
import { scheduledJobs } from "../schema";
import { firstOrNull } from "./utils";

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type NewScheduledJob = typeof scheduledJobs.$inferInsert;

export const createScheduledJobRepository = (db: Database) => ({
  create: async (data: NewScheduledJob): Promise<ScheduledJob> => {
    const rows = await db.insert(scheduledJobs).values(data).returning();
    return rows[0] as ScheduledJob;
  },
  update: async (
    id: string,
    data: Partial<NewScheduledJob>
  ): Promise<ScheduledJob | null> => {
    const rows = await db
      .update(scheduledJobs)
      .set(data)
      .where(eq(scheduledJobs.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<ScheduledJob | null> => {
    const rows = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.id, id));
    return firstOrNull(rows);
  },
  listByBookingId: async (bookingId: string): Promise<ScheduledJob[]> => {
    return db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.bookingId, bookingId))
      .orderBy(desc(scheduledJobs.createdAt));
  },
  listByStatus: async (status: string): Promise<ScheduledJob[]> => {
    return db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.status, status));
  },
  listByTypeAndStatus: async (
    jobType: NewScheduledJob["jobType"],
    status: string
  ): Promise<ScheduledJob[]> => {
    return db
      .select()
      .from(scheduledJobs)
      .where(
        and(
          eq(scheduledJobs.jobType, jobType),
          eq(scheduledJobs.status, status)
        )
      )
      .orderBy(desc(scheduledJobs.runAt));
  },
  listRecentErrors: async (limit = 10): Promise<ScheduledJob[]> => {
    return db
      .select()
      .from(scheduledJobs)
      .where(isNotNull(scheduledJobs.lastError))
      .orderBy(desc(scheduledJobs.updatedAt))
      .limit(limit);
  },
  countErrors: async (): Promise<number> => {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledJobs)
      .where(isNotNull(scheduledJobs.lastError));
    return Number(rows[0]?.count ?? 0);
  },
});
