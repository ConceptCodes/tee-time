import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { createTeamRepository } from "../repositories/teams";

const testDatabaseUrl = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tee_time_test";
let sql: postgres.Sql;
let db: any;

beforeAll(async () => {
  sql = postgres(testDatabaseUrl);
  db = drizzle(sql, { schema });
});

afterAll(async () => {
  await sql.end();
});

describe("teams repository", () => {
  let repo: any;

  beforeAll(async () => {
    repo = createTeamRepository(db);
    await db.delete(schema.clubs);
    await db.delete(schema.teams);
  });

  test("create: inserts team and returns with id", async () => {
    const team = await repo.create({
      name: "Sales Team",
      slackChannel: "#sales",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(team).toBeDefined();
    expect(team.id).toBeDefined();
    expect(team.name).toBe("Sales Team");
    expect(team.slackChannel).toBe("#sales");
  });

  test("getById: returns team by id", async () => {
    const created = await repo.create({
      name: "Engineering Team",
      slackChannel: "#engineering",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const retrieved = await repo.getById(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe("Engineering Team");
  });

  test("getById: returns null for non-existent id", async () => {
    const retrieved = await repo.getById("00000000-0000-0000-0000-000000000000");
    expect(retrieved).toBeNull();
  });

  test("listAll: returns all teams", async () => {
    await db.delete(schema.teams);

    await repo.create({
      name: "Team A",
      slackChannel: "#a",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await repo.create({
      name: "Team B",
      slackChannel: "#b",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const list = await repo.listAll();
    expect(list).toHaveLength(2);
    expect(list.map(t => t.name)).toContain("Team A");
    expect(list.map(t => t.name)).toContain("Team B");
  });

  test("update: modifies team fields", async () => {
    const created = await repo.create({
      name: "Original Name",
      slackChannel: "#original",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const updated = await repo.update(created.id, {
      name: "Updated Name",
      slackChannel: "#updated"
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.slackChannel).toBe("#updated");
  });

  test("update: returns null for non-existent id", async () => {
    const updated = await repo.update("00000000-0000-0000-0000-000000000000", {
      name: "No Team"
    });

    expect(updated).toBeNull();
  });

  test("delete: removes team", async () => {
    const created = await repo.create({
      name: "Team to Delete",
      slackChannel: "#delete",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await repo.delete(created.id);
    const retrieved = await repo.getById(created.id);
    expect(retrieved).toBeNull();
  });

  test("delete: orphans clubs with matching teamId by setting to null", async () => {
    const team = await repo.create({
      name: "Team with Clubs",
      slackChannel: "#clubs",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const club1 = await db.insert(schema.clubs).values({
      name: "Club 1",
      isActive: true,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const club2 = await db.insert(schema.clubs).values({
      name: "Club 2",
      isActive: true,
      teamId: team.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    await repo.delete(team.id);

    const orphaned1 = await db.select().from(schema.clubs).where(eq(schema.clubs.id, club1[0].id));
    const orphaned2 = await db.select().from(schema.clubs).where(eq(schema.clubs.id, club2[0].id));

    expect(orphaned1[0].teamId).toBeNull();
    expect(orphaned2[0].teamId).toBeNull();
  });
});
