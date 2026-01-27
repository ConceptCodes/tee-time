import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, isNull } from "drizzle-orm";
import * as schema from "../schema";
import { createClubRepository } from "../repositories/clubs";
import { createTeamRepository } from "../repositories/teams";

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

describe("clubs repository - team filtering methods", () => {
  let clubRepo: any;
  let teamRepo: any;

  beforeAll(async () => {
    clubRepo = createClubRepository(db);
    teamRepo = createTeamRepository(db);
    await db.delete(schema.clubs);
    await db.delete(schema.teams);
  });

  test("listByTeamId: returns only clubs for specified team", async () => {
    const team = await teamRepo.create({
      name: "Test Team",
      slackChannel: "#test",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(schema.clubs).values({
      name: "Team Club 1",
      isActive: true,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(schema.clubs).values({
      name: "Team Club 2",
      isActive: true,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(schema.clubs).values({
      name: "Global Club",
      isActive: true,
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const teamClubs = await clubRepo.listByTeamId(team.id);
    expect(teamClubs).toHaveLength(2);
    expect(teamClubs.every((c: any) => c.teamId === team.id)).toBe(true);
  });

  test("listGlobal: returns only clubs with teamId IS NULL", async () => {
    await db.delete(schema.clubs);
    const team = await teamRepo.create({
      name: "Another Team",
      slackChannel: "#another",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(schema.clubs).values({
      name: "Global Club 1",
      isActive: true,
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(schema.clubs).values({
      name: "Global Club 2",
      isActive: true,
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(schema.clubs).values({
      name: "Team Club",
      isActive: true,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const globalClubs = await clubRepo.listGlobal();
    expect(globalClubs).toHaveLength(2);
    expect(globalClubs.every((c: any) => c.teamId === null)).toBe(true);
  });

  test("assignToTeam: updates club's teamId", async () => {
    await db.delete(schema.clubs);
    const team = await teamRepo.create({
      name: "Assignment Team",
      slackChannel: "#assign",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const club = await db.insert(schema.clubs).values({
      name: "Unassigned Club",
      isActive: true,
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const updated = await clubRepo.assignToTeam(club[0].id, team.id);
    expect(updated).toBeDefined();
    expect(updated?.teamId).toBe(team.id);
  });

  test("assignToTeam: returns null for non-existent club", async () => {
    const team = await teamRepo.create({
      name: "Test Team 2",
      slackChannel: "#test2",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await clubRepo.assignToTeam("00000000-0000-0000-0000-000000000000", team.id);
    expect(result).toBeNull();
  });

  test("getClubWithTeam: returns club with team's slackChannel via join", async () => {
    await db.delete(schema.clubs);
    const team = await teamRepo.create({
      name: "Join Team",
      slackChannel: "#join",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const club = await db.insert(schema.clubs).values({
      name: "Club with Team",
      isActive: true,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const result = await clubRepo.getClubWithTeam(club[0].id);
    expect(result).toBeDefined();
    expect(result?.club.id).toBe(club[0].id);
    expect(result?.club.name).toBe("Club with Team");
    expect(result?.team?.slackChannel).toBe("#join");
  });

  test("getClubWithTeam: returns club with team=null for global club", async () => {
    await db.delete(schema.clubs);
    const club = await db.insert(schema.clubs).values({
      name: "Global Club Only",
      isActive: true,
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const result = await clubRepo.getClubWithTeam(club[0].id);
    expect(result).toBeDefined();
    expect(result?.club.id).toBe(club[0].id);
    expect(result?.team).toBeNull();
  });

  test("getClubWithTeam: returns null for non-existent club", async () => {
    const result = await clubRepo.getClubWithTeam("00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });
});
