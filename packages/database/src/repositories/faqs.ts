import { eq } from "drizzle-orm";
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
  listActive: async (): Promise<FaqEntry[]> => {
    return db.select().from(faqEntries).where(eq(faqEntries.isActive, true));
  },
});
