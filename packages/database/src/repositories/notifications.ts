import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { type Database } from "../client";
import { notifications } from "../schema";
import { firstOrNull } from "./utils";

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export const createNotificationRepository = (db: Database) => ({
  create: async (data: NewNotification): Promise<Notification> => {
    const rows = await db.insert(notifications).values(data).returning();
    return rows[0] as Notification;
  },
  update: async (
    id: string,
    data: Partial<NewNotification>
  ): Promise<Notification | null> => {
    const rows = await db
      .update(notifications)
      .set(data)
      .where(eq(notifications.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<Notification | null> => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return firstOrNull(rows);
  },
  listByBookingId: async (bookingId: string): Promise<Notification[]> => {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.bookingId, bookingId));
  },
  claimPendingByBookingId: async (bookingId: string): Promise<Notification[]> => {
    const rows = await db
      .update(notifications)
      .set({ status: "processing" })
      .where(
        and(
          eq(notifications.bookingId, bookingId),
          eq(notifications.status, "pending")
        )
      )
      .returning();
    return rows as Notification[];
  },
  updateByProviderMessageId: async (
    providerMessageId: string,
    data: Partial<NewNotification>
  ): Promise<Notification | null> => {
    const rows = await db
      .update(notifications)
      .set(data)
      .where(eq(notifications.providerMessageId, providerMessageId))
      .returning();
    return firstOrNull(rows);
  },
  listRecentErrors: async (limit = 10): Promise<Notification[]> => {
    return db
      .select()
      .from(notifications)
      .where(isNotNull(notifications.error))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },
  countErrors: async (): Promise<number> => {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(isNotNull(notifications.error));
    return Number(rows[0]?.count ?? 0);
  },
});
