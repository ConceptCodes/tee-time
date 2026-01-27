import { eq, and } from "drizzle-orm";
import { type Database } from "../client";
import { teamMemberships } from "../schema";
import { firstOrNull } from "./utils";

export type TeamMembership = typeof teamMemberships.$inferSelect;
export type NewTeamMembership = typeof teamMemberships.$inferInsert;

export const createTeamMembershipRepository = (db: Database) => ({
  addMember: async (teamId: string, staffUserId: string): Promise<TeamMembership> => {
    try {
      const rows = await db
        .insert(teamMemberships)
        .values({
          teamId,
          staffUserId,
          createdAt: new Date(),
        })
        .returning();
      return rows[0] as TeamMembership;
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        const existing = await db
          .select()
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.teamId, teamId),
              eq(teamMemberships.staffUserId, staffUserId)
            )
          );
        return firstOrNull(existing) as TeamMembership;
      }
      throw error;
    }
  },

  removeMember: async (teamId: string, staffUserId: string): Promise<boolean> => {
    const result = await db
      .delete(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.staffUserId, staffUserId)
        )
      )
      .returning();
    return result.length > 0;
  },

  listByTeamId: async (teamId: string): Promise<TeamMembership[]> => {
    const rows = await db
      .select()
      .from(teamMemberships)
      .where(eq(teamMemberships.teamId, teamId));
    return rows;
  },

  listByStaffUserId: async (staffUserId: string): Promise<TeamMembership[]> => {
    const rows = await db
      .select()
      .from(teamMemberships)
      .where(eq(teamMemberships.staffUserId, staffUserId));
    return rows;
  },
});
