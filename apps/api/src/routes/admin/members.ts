import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import {
  createMemberProfile,
  disableMemberProfile,
  getMemberById,
  listMembers,
  updateMemberProfile
} from "@tee-time/core";
import { logger } from "@tee-time/core";
import { createMemberRepository } from "@tee-time/database";
import { memberSchemas } from "../../schemas";
import { paginatedResponse, parsePagination } from "../../pagination";

export const memberRoutes = new Hono<{ Variables: ApiVariables }>();

memberRoutes.use("*", requireAuth(), requireRole(["admin"]));

memberRoutes.get("/", async (c) => {
  const search = c.req.query("search") ?? undefined;
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listMembers(db, { search, ...pagination });
  return c.json(paginatedResponse(result.data, pagination, result.total));
});

memberRoutes.get("/:id", async (c) => {
  const db = getDb();
  const member = await getMemberById(db, c.req.param("id"));
  if (!member) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: member });
});

memberRoutes.post("/", validateJson(memberSchemas.create), async (c) => {
  const parsed = c.get("validatedBody") as typeof memberSchemas.create._type;
  const db = getDb();
  const now = new Date();
  const member = await createMemberProfile(db, {
    ...parsed,
    onboardingCompletedAt: parsed.onboardingCompletedAt
      ? new Date(parsed.onboardingCompletedAt)
      : null,
    isActive: parsed.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ data: member }, 201);
});

memberRoutes.post("/invite", validateJson(memberSchemas.invite), async (c) => {
  const parsed = c.get("validatedBody") as typeof memberSchemas.invite._type;
  const db = getDb();
  const repo = createMemberRepository(db);
  const existing = await repo.getByPhoneNumber(parsed.phoneNumber);
  if (existing) {
    return c.json({ error: "Member already exists" }, 409);
  }
  // TODO: implement invite flow (SMS/WhatsApp) and persistence.
  logger.info("api.members.invite", { phoneNumber: parsed.phoneNumber });
  return c.json({ data: { phoneNumber: parsed.phoneNumber } }, 202);
});

memberRoutes.put("/:id", validateJson(memberSchemas.update), async (c) => {
  const parsed = c.get("validatedBody") as typeof memberSchemas.update._type;
  const db = getDb();
  const member = await updateMemberProfile(db, c.req.param("id"), {
    ...parsed,
    onboardingCompletedAt: parsed.onboardingCompletedAt
      ? new Date(parsed.onboardingCompletedAt)
      : undefined,
    updatedAt: new Date()
  });
  if (!member) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: member });
});

memberRoutes.post("/:id/disable", async (c) => {
  const db = getDb();
  const member = await disableMemberProfile(db, c.req.param("id"));
  if (!member) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: member });
});
