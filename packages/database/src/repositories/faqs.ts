import { eq, sql } from "drizzle-orm";
import { type Database } from "../client";
import { faqEntries } from "../schema";
import { firstOrNull } from "./utils";

export type FaqEntry = typeof faqEntries.$inferSelect;
export type NewFaqEntry = typeof faqEntries.$inferInsert;

export const createFaqRepository = (db: Database) => ({
  create: async (data: NewFaqEntry): Promise<FaqEntry> => {
    const rows = await db.insert(faqEntries).values(data).returning();
    return rows[0] as FaqEntry;
  },
  update: async (
    id: string,
    data: Partial<NewFaqEntry>
  ): Promise<FaqEntry | null> => {
    const rows = await db
      .update(faqEntries)
      .set(data)
      .where(eq(faqEntries.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<FaqEntry | null> => {
    const rows = await db
      .select()
      .from(faqEntries)
      .where(eq(faqEntries.id, id));
    return firstOrNull(rows);
  },
  listActive: async (params?: { limit?: number; offset?: number }): Promise<FaqEntry[]> => {
    const query = db.select().from(faqEntries).where(eq(faqEntries.isActive, true));
    if (params?.limit) {
      query.limit(params.limit);
    }
    if (params?.offset) {
      query.offset(params.offset);
    }
    return query;
  },
  countActive: async (): Promise<number> => {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(faqEntries)
      .where(eq(faqEntries.isActive, true));
    return Number(rows[0]?.count ?? 0);
  },
});
