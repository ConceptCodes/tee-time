import { eq } from "drizzle-orm";
import { type Database } from "../client";
import { bookingStates } from "../schema";
import { firstOrNull } from "./utils";

export type BookingState = typeof bookingStates.$inferSelect;
export type NewBookingState = typeof bookingStates.$inferInsert;

export const createBookingStateRepository = (db: Database) => ({
  getByMemberId: async (memberId: string): Promise<BookingState | null> => {
    const rows = await db
      .select()
      .from(bookingStates)
      .where(eq(bookingStates.memberId, memberId));
    return firstOrNull(rows);
  },
  upsert: async (data: NewBookingState): Promise<BookingState> => {
    const rows = await db
      .insert(bookingStates)
      .values(data)
      .onConflictDoUpdate({
        target: bookingStates.memberId,
        set: {
          state: data.state,
          updatedAt: data.updatedAt
        }
      })
      .returning();
    return rows[0] as BookingState;
  },
  deleteByMemberId: async (memberId: string): Promise<BookingState | null> => {
    const rows = await db
      .delete(bookingStates)
      .where(eq(bookingStates.memberId, memberId))
      .returning();
    return firstOrNull(rows);
  }
});
