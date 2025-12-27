import { and, eq, sql } from "drizzle-orm";
import { type Database } from "../client";
import { clubLocationBays } from "../schema";
import { firstOrNull } from "./utils";

export type ClubLocationBay = typeof clubLocationBays.$inferSelect;
export type NewClubLocationBay = typeof clubLocationBays.$inferInsert;

export const createClubLocationBayRepository = (db: Database) => ({
  create: async (data: NewClubLocationBay): Promise<ClubLocationBay> => {
    const rows = await db.insert(clubLocationBays).values(data).returning();
    return rows[0] as ClubLocationBay;
  },
  update: async (
    id: string,
    data: Partial<NewClubLocationBay>
  ): Promise<ClubLocationBay | null> => {
    const rows = await db
      .update(clubLocationBays)
      .set(data)
      .where(eq(clubLocationBays.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<ClubLocationBay | null> => {
    const rows = await db
      .select()
      .from(clubLocationBays)
      .where(eq(clubLocationBays.id, id));
    return firstOrNull(rows);
  },
  listByLocationId: async (
    clubLocationId: string,
    params?: { status?: "available" | "booked" | "maintenance" }
  ): Promise<ClubLocationBay[]> => {
    const query = db
      .select()
      .from(clubLocationBays)
      .where(eq(clubLocationBays.clubLocationId, clubLocationId));
    if (params?.status) {
      query.where(eq(clubLocationBays.status, params.status));
    }
    return query;
  },
  countByLocationId: async (
    clubLocationId: string,
    params?: { status?: "available" | "booked" | "maintenance" }
  ): Promise<number> => {
    const query = db
      .select({ count: sql<number>`count(*)` })
      .from(clubLocationBays)
      .where(eq(clubLocationBays.clubLocationId, clubLocationId));
    if (params?.status) {
      query.where(eq(clubLocationBays.status, params.status));
    }
    const rows = await query;
    return Number(rows[0]?.count ?? 0);
  },
  reserve: async (
    id: string,
    updatedAt = new Date()
  ): Promise<ClubLocationBay | null> => {
    const rows = await db
      .update(clubLocationBays)
      .set({ status: "booked", updatedAt })
      .where(and(eq(clubLocationBays.id, id), eq(clubLocationBays.status, "available")))
      .returning();
    return firstOrNull(rows);
  },
  release: async (
    id: string,
    updatedAt = new Date()
  ): Promise<ClubLocationBay | null> => {
    const rows = await db
      .update(clubLocationBays)
      .set({ status: "available", updatedAt })
      .where(eq(clubLocationBays.id, id))
      .returning();
    return firstOrNull(rows);
  }
});
