import { desc, eq, sql } from "drizzle-orm";
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
  list: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SupportRequest[]> => {
    const query = db
      .select()
      .from(supportRequests)
      .orderBy(desc(supportRequests.createdAt));
    if (params?.status) {
      query.where(eq(supportRequests.status, params.status));
    }
    if (params?.limit) {
      query.limit(params.limit);
    }
    if (params?.offset) {
      query.offset(params.offset);
    }
    return query;
  },
  count: async (params?: { status?: string }): Promise<number> => {
    const query = db
      .select({ count: sql<number>`count(*)` })
      .from(supportRequests);
    if (params?.status) {
      query.where(eq(supportRequests.status, params.status));
    }
    const rows = await query;
    return Number(rows[0]?.count ?? 0);
  },
  resolve: async (
    id: string,
    resolvedAt = new Date()
  ): Promise<SupportRequest | null> => {
    const rows = await db
      .update(supportRequests)
      .set({ status: "resolved", resolvedAt })
      .where(eq(supportRequests.id, id))
      .returning();
    return firstOrNull(rows);
  },
});
