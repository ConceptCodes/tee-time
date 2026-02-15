import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import {
  createStaffUser,
  getStaffUserById,
  listStaffUsers,
  logAuditEvent,
  updateStaffUser
} from "@tee-time/core";
import { staffSchemas } from "../../schemas";
import { paginatedResponse, parsePagination } from "../../pagination";

export const staffRoutes = new Hono<{ Variables: ApiVariables }>();

staffRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

const requireAdmin = (role: string | undefined) => role === "admin";

staffRoutes.get("/", async (c) => {
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listStaffUsers(db, pagination);
  return c.json(paginatedResponse(result.data, pagination, result.total));
});

staffRoutes.get("/:id", async (c) => {
  const db = getDb();
  const staffUser = await getStaffUserById(db, c.req.param("id"));
  if (!staffUser) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: staffUser });
});

staffRoutes.post("/", validateJson(staffSchemas.create), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const parsed = c.get("validatedBody") as z.infer<typeof staffSchemas.create>;
  const now = new Date();
  const db = getDb();
  const staffUser = await createStaffUser(db, {
    ...parsed,
    isActive: parsed.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "staff.create",
    resourceType: "staff_user",
    resourceId: staffUser.id,
    metadata: {}
  });
  return c.json({ data: staffUser }, 201);
});

staffRoutes.put("/:id", validateJson(staffSchemas.update), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const parsed = c.get("validatedBody") as z.infer<typeof staffSchemas.update>;
  const db = getDb();
  const staffUser = await updateStaffUser(db, c.req.param("id"), {
    ...parsed,
    updatedAt: new Date()
  });
  if (!staffUser) {
    return c.json({ error: "Not Found" }, 404);
  }
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "staff.update",
    resourceType: "staff_user",
    resourceId: staffUser.id,
    metadata: {}
  });
  return c.json({ data: staffUser });
});

staffRoutes.post("/:id/disable", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const db = getDb();
  const staffUser = await updateStaffUser(db, c.req.param("id"), {
    isActive: false,
    updatedAt: new Date()
  });
  if (!staffUser) {
    return c.json({ error: "Not Found" }, 404);
  }
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "staff.disable",
    resourceType: "staff_user",
    resourceId: staffUser.id,
    metadata: {}
  });
  return c.json({ data: staffUser });
});
