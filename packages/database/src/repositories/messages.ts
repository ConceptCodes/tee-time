import { and, desc, eq } from "drizzle-orm";
import { type Database } from "../client";
import { messageDedup, messageLogs } from "../schema";
import { firstOrNull } from "./utils";

export type MessageLog = typeof messageLogs.$inferSelect;
export type NewMessageLog = typeof messageLogs.$inferInsert;
export type MessageDedup = typeof messageDedup.$inferSelect;
export type NewMessageDedup = typeof messageDedup.$inferInsert;

export const createMessageLogRepository = (db: Database) => ({
  create: async (data: NewMessageLog): Promise<MessageLog> => {
    const rows = await db.insert(messageLogs).values(data).returning();
    return rows[0] as MessageLog;
  },
  logMessage: async (
    data: Omit<NewMessageLog, "createdAt"> & { createdAt?: Date }
  ): Promise<MessageLog> => {
    const rows = await db
      .insert(messageLogs)
      .values({
        ...data,
        createdAt: data.createdAt ?? new Date()
      })
      .returning();
    return rows[0] as MessageLog;
  },
  listByMemberId: async (memberId: string): Promise<MessageLog[]> => {
    return db
      .select()
      .from(messageLogs)
      .where(eq(messageLogs.memberId, memberId))
      .orderBy(desc(messageLogs.createdAt));
  },
});

export const createMessageDedupRepository = (db: Database) => ({
  create: async (data: NewMessageDedup): Promise<MessageDedup> => {
    const rows = await db.insert(messageDedup).values(data).returning();
    return rows[0] as MessageDedup;
  },
  createWithExpiry: async (
    data: Omit<NewMessageDedup, "receivedAt" | "expiresAt"> & {
      receivedAt?: Date;
      expiresAt: Date;
    }
  ): Promise<MessageDedup> => {
    const rows = await db
      .insert(messageDedup)
      .values({
        ...data,
        receivedAt: data.receivedAt ?? new Date()
      })
      .returning();
    return rows[0] as MessageDedup;
  },
  getByMemberAndHash: async (
    memberId: string,
    messageHash: string
  ): Promise<MessageDedup | null> => {
    const rows = await db
      .select()
      .from(messageDedup)
      .where(
        and(
          eq(messageDedup.memberId, memberId),
          eq(messageDedup.messageHash, messageHash)
        )
      );
    return firstOrNull(rows);
  },
});
