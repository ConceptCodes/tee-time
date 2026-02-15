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
import { logAuditEvent } from "@tee-time/core";
import { teamSchemas } from "../../schemas";

export const teamRoutes = new Hono<{ Variables: ApiVariables }>();

teamRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

const requireAdmin = (role: string | undefined) => role === "admin";

teamRoutes.get("/", async (c) => {
  const db = getDb();
  const teamRepo = createTeamRepository(db);
  const teams = await teamRepo.listAll();
  return c.json({ data: teams });
});

teamRoutes.post("/", validateJson(teamSchemas.create), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
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
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "team.create",
    resourceType: "team",
    resourceId: team.id,
    metadata: {}
  });
  return c.json({ data: team }, 201);
});

teamRoutes.patch("/:id", validateJson(teamSchemas.update), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
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
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "team.update",
    resourceType: "team",
    resourceId: team.id,
    metadata: {}
  });
  return c.json({ data: team });
});

teamRoutes.delete("/:id", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const db = getDb();
  const teamRepo = createTeamRepository(db);
  try {
    const teamId = c.req.param("id");
    await teamRepo.delete(teamId);
    await logAuditEvent(db, {
      actorId: c.get("staffUser")?.id ?? null,
      action: "team.delete",
      resourceType: "team",
      resourceId: teamId,
      metadata: {}
    });
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
    if (!requireAdmin(c.get("staffUser")?.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
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
      await logAuditEvent(db, {
        actorId: c.get("staffUser")?.id ?? null,
        action: "team.member.add",
        resourceType: "team_membership",
        resourceId: membership.id,
        metadata: {
          teamId: c.req.param("id"),
          staffUserId: parsed.staffUserId
        }
      });
      return c.json({ data: membership }, 201);
    } catch (error) {
      return c.json({ error: "Failed to add member to team" }, 500);
    }
  }
);

teamRoutes.delete("/:id/members/:staffId", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
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
    await logAuditEvent(db, {
      actorId: c.get("staffUser")?.id ?? null,
      action: "team.member.remove",
      resourceType: "team",
      resourceId: c.req.param("id"),
      metadata: { staffUserId: c.req.param("staffId") }
    });
    return c.json({ success: true }, 200);
  } catch (error) {
    return c.json({ error: "Failed to remove member from team" }, 500);
  }
});
