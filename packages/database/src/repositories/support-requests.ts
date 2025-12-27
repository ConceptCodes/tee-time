import { eq } from "drizzle-orm";
import { type Database } from "../client";
import { supportRequests } from "../schema";
import { firstOrNull } from "./utils";

export type SupportRequest = typeof supportRequests.$inferSelect;
export type NewSupportRequest = typeof supportRequests.$inferInsert;

export const createSupportRequestRepository = (db: Database) => ({
  create: async (data: NewSupportRequest): Promise<SupportRequest> => {
    const rows = await db.insert(supportRequests).values(data).returning();
    return rows[0] as SupportRequest;
  },
  update: async (
    id: string,
    data: Partial<NewSupportRequest>
  ): Promise<SupportRequest | null> => {
    const rows = await db
      .update(supportRequests)
      .set(data)
      .where(eq(supportRequests.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<SupportRequest | null> => {
    const rows = await db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.id, id));
    return firstOrNull(rows);
  },
});
