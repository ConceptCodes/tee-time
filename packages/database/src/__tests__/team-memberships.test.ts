import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { createTeamMembershipRepository } from "../repositories/team-memberships";

const testDatabaseUrl = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tee_time_test";
let pool: Pool;
let db: any;

beforeAll(async () => {
  pool = new Pool({ connectionString: testDatabaseUrl });
  db = drizzle(pool, { schema });
});

afterAll(async () => {
  await pool.end();
});

describe("Team Membership Repository", () => {
  let repo: any;
  let teamId: string;
  let staffUserId1: string;
  let staffUserId2: string;

  beforeAll(async () => {
    repo = createTeamMembershipRepository(db);
    await db.delete(schema.teamMemberships).where(true);

    const teamRows = await db.insert(schema.teams).values({
      name: "Test Team",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    teamId = teamRows[0].id;

    const staff1 = await db.insert(schema.staffUsers).values({
      name: "Staff One",
      whatsappNumber: "+1234567890",
      email: "staff1@example.com",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    staffUserId1 = staff1[0].id;

    const staff2 = await db.insert(schema.staffUsers).values({
      name: "Staff Two",
      whatsappNumber: "+0987654321",
      email: "staff2@example.com",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    staffUserId2 = staff2[0].id;
  });

  test("addMember creates a new team membership", async () => {
    const result = await repo.addMember(teamId, staffUserId1);
    expect(result).toBeDefined();
    expect(result.teamId).toBe(teamId);
    expect(result.staffUserId).toBe(staffUserId1);
    expect(result.id).toBeDefined();
  });

  test("addMember on existing membership handles gracefully (no duplicate)", async () => {
    const first = await repo.addMember(teamId, staffUserId1);
    expect(first).toBeDefined();

    const second = await repo.addMember(teamId, staffUserId1);
    expect(second).toBeDefined();
    expect(second.id).toBe(first.id);

    const list = await repo.listByTeamId(teamId);
    const matches = list.filter(m => m.staffUserId === staffUserId1);
    expect(matches.length).toBe(1);
  });

  test("removeMember deletes a team membership", async () => {
    const added = await repo.addMember(teamId, staffUserId2);
    expect(added).toBeDefined();

    const removed = await repo.removeMember(teamId, staffUserId2);
    expect(removed).toBe(true);

    const list = await repo.listByTeamId(teamId);
    const matches = list.filter(m => m.staffUserId === staffUserId2);
    expect(matches.length).toBe(0);
  });

  test("removeMember returns false if membership doesn't exist", async () => {
    const result = await repo.removeMember(teamId, staffUserId2);
    expect(result).toBe(false);
  });

  test("listByTeamId returns all staff in a team", async () => {
    await db.delete(schema.teamMemberships);

    await repo.addMember(teamId, staffUserId1);
    await repo.addMember(teamId, staffUserId2);

    const list = await repo.listByTeamId(teamId);
    expect(list.length).toBe(2);
    expect(list.map(m => m.staffUserId)).toContain(staffUserId1);
    expect(list.map(m => m.staffUserId)).toContain(staffUserId2);
  });

  test("listByTeamId returns empty array if no members", async () => {
    const emptyTeam = await db.insert(schema.teams).values({
      name: "Empty Team",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const list = await repo.listByTeamId(emptyTeam[0].id);
    expect(list).toEqual([]);
  });

  test("listByStaffUserId returns all teams for a staff member", async () => {
    await db.delete(schema.teamMemberships);

    const team2Rows = await db.insert(schema.teams).values({
      name: "Team Two",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    const teamId2 = team2Rows[0].id;

    await repo.addMember(teamId, staffUserId1);
    await repo.addMember(teamId2, staffUserId1);

    const list = await repo.listByStaffUserId(staffUserId1);
    expect(list.length).toBe(2);
    expect(list.map(m => m.teamId)).toContain(teamId);
    expect(list.map(m => m.teamId)).toContain(teamId2);
  });

  test("listByStaffUserId returns empty array if staff in no teams", async () => {
    const staff3 = await db.insert(schema.staffUsers).values({
      name: "Staff Three",
      whatsappNumber: "+9999999999",
      email: "staff3@example.com",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const list = await repo.listByStaffUserId(staff3[0].id);
    expect(list).toEqual([]);
  });
});
