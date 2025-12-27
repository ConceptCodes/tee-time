import { and, eq } from "drizzle-orm";
import { type Database } from "../client";
import { clubLocations, clubs } from "../schema";
import { firstOrNull } from "./utils";

export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;
export type ClubLocation = typeof clubLocations.$inferSelect;
export type NewClubLocation = typeof clubLocations.$inferInsert;

export const createClubRepository = (db: Database) => ({
  create: async (data: NewClub): Promise<Club> => {
    const rows = await db.insert(clubs).values(data).returning();
    return rows[0] as Club;
  },
  update: async (id: string, data: Partial<NewClub>): Promise<Club | null> => {
    const rows = await db
      .update(clubs)
      .set(data)
      .where(eq(clubs.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<Club | null> => {
    const rows = await db.select().from(clubs).where(eq(clubs.id, id));
    return firstOrNull(rows);
  },
  getByName: async (name: string): Promise<Club | null> => {
    const rows = await db.select().from(clubs).where(eq(clubs.name, name));
    return firstOrNull(rows);
  },
  listActive: async (): Promise<Club[]> => {
    return db.select().from(clubs).where(eq(clubs.isActive, true));
  },
  listAll: async (): Promise<Club[]> => {
    return db.select().from(clubs);
  },
});

export const createClubLocationRepository = (db: Database) => ({
  create: async (data: NewClubLocation): Promise<ClubLocation> => {
    const rows = await db.insert(clubLocations).values(data).returning();
    return rows[0] as ClubLocation;
  },
  update: async (
    id: string,
    data: Partial<NewClubLocation>
  ): Promise<ClubLocation | null> => {
    const rows = await db
      .update(clubLocations)
      .set(data)
      .where(eq(clubLocations.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<ClubLocation | null> => {
    const rows = await db
      .select()
      .from(clubLocations)
      .where(eq(clubLocations.id, id));
    return firstOrNull(rows);
  },
  listByClubId: async (clubId: string): Promise<ClubLocation[]> => {
    return db
      .select()
      .from(clubLocations)
      .where(eq(clubLocations.clubId, clubId));
  },
  listActiveByClubId: async (clubId: string): Promise<ClubLocation[]> => {
    return db
      .select()
      .from(clubLocations)
      .where(
        and(eq(clubLocations.clubId, clubId), eq(clubLocations.isActive, true))
      );
  },
  delete: async (id: string): Promise<ClubLocation | null> => {
    const rows = await db
      .delete(clubLocations)
      .where(eq(clubLocations.id, id))
      .returning();
    return firstOrNull(rows);
  },
});
