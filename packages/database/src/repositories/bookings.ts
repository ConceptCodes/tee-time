import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type Database } from "../client";
import { bookingStatusHistory, bookings } from "../schema";
import { firstOrNull } from "./utils";

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type BookingStatusHistory = typeof bookingStatusHistory.$inferSelect;
export type NewBookingStatusHistory = typeof bookingStatusHistory.$inferInsert;

export const createBookingRepository = (db: Database) => ({
  create: async (data: NewBooking): Promise<Booking> => {
    const rows = await db.insert(bookings).values(data).returning();
    return rows[0] as Booking;
  },
  update: async (
    id: string,
    data: Partial<NewBooking>
  ): Promise<Booking | null> => {
    const rows = await db
      .update(bookings)
      .set(data)
      .where(eq(bookings.id, id))
      .returning();
    return firstOrNull(rows);
  },
  updateStatus: async (params: {
    id: string;
    status: Booking["status"];
    staffMemberId?: string | null;
    cancelledAt?: Date | null;
    updatedAt?: Date;
  }): Promise<Booking | null> => {
    const rows = await db
      .update(bookings)
      .set({
        status: params.status,
        staffMemberId: params.staffMemberId ?? null,
        cancelledAt: params.cancelledAt ?? null,
        updatedAt: params.updatedAt ?? new Date()
      })
      .where(eq(bookings.id, params.id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<Booking | null> => {
    const rows = await db.select().from(bookings).where(eq(bookings.id, id));
    return firstOrNull(rows);
  },
  listByMemberId: async (memberId: string): Promise<Booking[]> => {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.memberId, memberId))
      .orderBy(desc(bookings.createdAt));
  },
  listRecent: async (limit = 20): Promise<Booking[]> => {
    return db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(limit);
  },
  countByStatus: async (params?: {
    since?: Date;
  }): Promise<Array<{ status: Booking["status"]; count: number }>> => {
    const query = db
      .select({
        status: bookings.status,
        count: sql<number>`count(*)`
      })
      .from(bookings);
    if (params?.since) {
      query.where(sql`${bookings.createdAt} >= ${params.since}`);
    }
    const rows = await query.groupBy(bookings.status);
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count)
    }));
  },
  countByStatusSet: async (
    statuses: Booking["status"][],
    params?: { since?: Date }
  ) => {
    const conditions = [inArray(bookings.status, statuses)];
    if (params?.since) {
      conditions.push(sql`${bookings.createdAt} >= ${params.since}`);
    }
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(bookings)
      .where(and(...conditions));
    return Number(rows[0]?.count ?? 0);
  },
  countTotal: async (params?: { since?: Date }) => {
    const query = db
      .select({
        count: sql<number>`count(*)`
      })
      .from(bookings);
    if (params?.since) {
      query.where(sql`${bookings.createdAt} >= ${params.since}`);
    }
    const rows = await query;
    return Number(rows[0]?.count ?? 0);
  }
});

export const createBookingStatusHistoryRepository = (db: Database) => ({
  create: async (
    data: NewBookingStatusHistory
  ): Promise<BookingStatusHistory> => {
    const rows = await db.insert(bookingStatusHistory).values(data).returning();
    return rows[0] as BookingStatusHistory;
  },
  listByBookingId: async (
    bookingId: string
  ): Promise<BookingStatusHistory[]> => {
    return db
      .select()
      .from(bookingStatusHistory)
      .where(eq(bookingStatusHistory.bookingId, bookingId))
      .orderBy(desc(bookingStatusHistory.createdAt));
  },
});
