import { eq } from "drizzle-orm";
import { type Database } from "../client";
import { teams, clubs } from "../schema";
import { firstOrNull } from "./utils";

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export const createTeamRepository = (db: Database) => ({
  create: async (data: NewTeam): Promise<Team> => {
    const rows = await db.insert(teams).values(data).returning();
    return rows[0] as Team;
  },

  getById: async (id: string): Promise<Team | null> => {
    const rows = await db.select().from(teams).where(eq(teams.id, id));
    return firstOrNull(rows);
  },

  listAll: async (): Promise<Team[]> => {
    return db.select().from(teams);
  },

  update: async (id: string, data: Partial<NewTeam>): Promise<Team | null> => {
    const rows = await db
      .update(teams)
      .set(data)
      .where(eq(teams.id, id))
      .returning();
    return firstOrNull(rows);
  },

  delete: async (id: string): Promise<void> => {
    await db.update(clubs).set({ teamId: null }).where(eq(clubs.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
  }
});
