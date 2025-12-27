import { eq } from "drizzle-orm";
import { type Database } from "../client";
import { staffUsers, teamMemberships, teams } from "../schema";
import { firstOrNull } from "./utils";

export type StaffUser = typeof staffUsers.$inferSelect;
export type NewStaffUser = typeof staffUsers.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMembership = typeof teamMemberships.$inferSelect;
export type NewTeamMembership = typeof teamMemberships.$inferInsert;

export const createStaffRepository = (db: Database) => ({
  create: async (data: NewStaffUser): Promise<StaffUser> => {
    const rows = await db.insert(staffUsers).values(data).returning();
    return rows[0] as StaffUser;
  },
  update: async (
    id: string,
    data: Partial<NewStaffUser>
  ): Promise<StaffUser | null> => {
    const rows = await db
      .update(staffUsers)
      .set(data)
      .where(eq(staffUsers.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<StaffUser | null> => {
    const rows = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, id));
    return firstOrNull(rows);
  },
  getByEmail: async (email: string): Promise<StaffUser | null> => {
    const rows = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.email, email));
    return firstOrNull(rows);
  },
});

export const createTeamRepository = (db: Database) => ({
  create: async (data: NewTeam): Promise<Team> => {
    const rows = await db.insert(teams).values(data).returning();
    return rows[0] as Team;
  },
  update: async (id: string, data: Partial<NewTeam>): Promise<Team | null> => {
    const rows = await db
      .update(teams)
      .set(data)
      .where(eq(teams.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<Team | null> => {
    const rows = await db.select().from(teams).where(eq(teams.id, id));
    return firstOrNull(rows);
  },
});

export const createTeamMembershipRepository = (db: Database) => ({
  create: async (data: NewTeamMembership): Promise<TeamMembership> => {
    const rows = await db.insert(teamMemberships).values(data).returning();
    return rows[0] as TeamMembership;
  },
  delete: async (id: string): Promise<TeamMembership | null> => {
    const rows = await db
      .delete(teamMemberships)
      .where(eq(teamMemberships.id, id))
      .returning();
    return firstOrNull(rows);
  },
});
