import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import {
  getDb,
  createTeamRepository,
  createTeamMembershipRepository
} from "@tee-time/database";
import { teamSchemas } from "../../schemas";

export const teamRoutes = new Hono<{ Variables: ApiVariables }>();

teamRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

teamRoutes.get("/", async (c) => {
  const db = getDb();
  const teamRepo = createTeamRepository(db);
  const teams = await teamRepo.listAll();
  return c.json({ data: teams });
});

teamRoutes.post("/", validateJson(teamSchemas.create), async (c) => {
  const parsed = c.get("validatedBody") as z.infer<typeof teamSchemas.create>;
  const db = getDb();
  const teamRepo = createTeamRepository(db);
  const now = new Date();
  const team = await teamRepo.create({
    name: parsed.name,
    slackChannel: parsed.slackChannel,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ data: team }, 201);
});

teamRoutes.patch("/:id", validateJson(teamSchemas.update), async (c) => {
  const parsed = c.get("validatedBody") as z.infer<typeof teamSchemas.update>;
  const db = getDb();
  const teamRepo = createTeamRepository(db);
  const team = await teamRepo.update(c.req.param("id"), {
    name: parsed.name,
    slackChannel: parsed.slackChannel,
    updatedAt: new Date()
  });
  if (!team) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: team });
});

teamRoutes.delete("/:id", async (c) => {
  const db = getDb();
  const teamRepo = createTeamRepository(db);
  try {
    await teamRepo.delete(c.req.param("id"));
    return c.json({ success: true }, 200);
  } catch (error) {
    return c.json({ error: "Failed to delete team" }, 500);
  }
});

teamRoutes.get("/:id/members", async (c) => {
  const db = getDb();
  const membershipRepo = createTeamMembershipRepository(db);
  const members = await membershipRepo.listByTeamId(c.req.param("id"));
  return c.json({ data: members });
});

teamRoutes.post(
  "/:id/members",
  validateJson(teamSchemas.addMember),
  async (c) => {
    const parsed = c.get("validatedBody") as z.infer<
      typeof teamSchemas.addMember
    >;
    const db = getDb();
    const membershipRepo = createTeamMembershipRepository(db);
    try {
      const membership = await membershipRepo.addMember(
        c.req.param("id"),
        parsed.staffUserId
      );
      return c.json({ data: membership }, 201);
    } catch (error) {
      return c.json({ error: "Failed to add member to team" }, 500);
    }
  }
);

teamRoutes.delete("/:id/members/:staffId", async (c) => {
  const db = getDb();
  const membershipRepo = createTeamMembershipRepository(db);
  try {
    const removed = await membershipRepo.removeMember(
      c.req.param("id"),
      c.req.param("staffId")
    );
    if (!removed) {
      return c.json({ error: "Membership not found" }, 404);
    }
    return c.json({ success: true }, 200);
  } catch (error) {
    return c.json({ error: "Failed to remove member from team" }, 500);
  }
});
