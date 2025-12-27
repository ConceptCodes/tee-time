import { eq, ilike, or } from "drizzle-orm";
import { type Database } from "../client";
import { memberProfiles } from "../schema";
import { firstOrNull } from "./utils";

export type MemberProfile = typeof memberProfiles.$inferSelect;
export type NewMemberProfile = typeof memberProfiles.$inferInsert;

export const createMemberRepository = (db: Database) => ({
  create: async (data: NewMemberProfile): Promise<MemberProfile> => {
    const rows = await db.insert(memberProfiles).values(data).returning();
    return rows[0] as MemberProfile;
  },
  update: async (
    id: string,
    data: Partial<NewMemberProfile>
  ): Promise<MemberProfile | null> => {
    const rows = await db
      .update(memberProfiles)
      .set(data)
      .where(eq(memberProfiles.id, id))
      .returning();
    return firstOrNull(rows);
  },
  disable: async (id: string): Promise<MemberProfile | null> => {
    const rows = await db
      .update(memberProfiles)
      .set({ isActive: false })
      .where(eq(memberProfiles.id, id))
      .returning();
    return firstOrNull(rows);
  },
  getById: async (id: string): Promise<MemberProfile | null> => {
    const rows = await db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.id, id));
    return firstOrNull(rows);
  },
  getByPhoneNumber: async (
    phoneNumber: string
  ): Promise<MemberProfile | null> => {
    const rows = await db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.phoneNumber, phoneNumber));
    return firstOrNull(rows);
  },
  getByMembershipId: async (
    membershipId: string
  ): Promise<MemberProfile | null> => {
    const rows = await db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.membershipId, membershipId));
    return firstOrNull(rows);
  },
  list: async (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<MemberProfile[]> => {
    const search = params?.search?.trim();
    const query = db.select().from(memberProfiles);
    if (search) {
      const like = `%${search}%`;
      query.where(
        or(
          ilike(memberProfiles.name, like),
          ilike(memberProfiles.membershipId, like)
        )
      );
    }
    if (params?.limit) {
      query.limit(params.limit);
    }
    if (params?.offset) {
      query.offset(params.offset);
    }
    return query;
  },
});
