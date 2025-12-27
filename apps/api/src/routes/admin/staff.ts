import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import {
  createStaffUser,
  getStaffUserById,
  listStaffUsers,
  updateStaffUser
} from "@tee-time/core";
import { staffSchemas } from "../../schemas";
import { paginatedResponse, parsePagination } from "../../pagination";

export const staffRoutes = new Hono<{ Variables: ApiVariables }>();

staffRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

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
  const parsed = c.get("validatedBody") as typeof staffSchemas.create._type;
  const now = new Date();
  const db = getDb();
  const staffUser = await createStaffUser(db, {
    ...parsed,
    isActive: parsed.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ data: staffUser }, 201);
});

staffRoutes.put("/:id", validateJson(staffSchemas.update), async (c) => {
  const parsed = c.get("validatedBody") as typeof staffSchemas.update._type;
  const db = getDb();
  const staffUser = await updateStaffUser(db, c.req.param("id"), {
    ...parsed,
    updatedAt: new Date()
  });
  if (!staffUser) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: staffUser });
});

staffRoutes.post("/:id/disable", async (c) => {
  const db = getDb();
  const staffUser = await updateStaffUser(db, c.req.param("id"), {
    isActive: false,
    updatedAt: new Date()
  });
  if (!staffUser) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: staffUser });
});
