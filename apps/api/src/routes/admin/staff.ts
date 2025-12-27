import { Hono } from "hono";
import { z } from "zod";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@syndicate/database";
import {
  createStaffUser,
  getStaffUserById,
  listStaffUsers,
  updateStaffUser
} from "@syndicate/core";

const createStaffSchema = z.object({
  authUserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "member"]),
  isActive: z.boolean().optional()
});

const updateStaffSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "member"]).optional(),
  isActive: z.boolean().optional()
});

export const staffRoutes = new Hono<{ Variables: ApiVariables }>();

staffRoutes.use("*", requireAuth(), requireRole(["admin"]));

staffRoutes.get("/", async (c) => {
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
  const offset = c.req.query("offset") ? Number(c.req.query("offset")) : undefined;
  const db = getDb();
  const staffUsers = await listStaffUsers(db, { limit, offset });
  return c.json({ data: staffUsers });
});

staffRoutes.get("/:id", async (c) => {
  const db = getDb();
  const staffUser = await getStaffUserById(db, c.req.param("id"));
  if (!staffUser) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: staffUser });
});

staffRoutes.post("/", async (c) => {
  const payload = await c.req.json();
  const parsed = createStaffSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", details: parsed.error.format() }, 400);
  }
  const now = new Date();
  const db = getDb();
  const staffUser = await createStaffUser(db, {
    ...parsed.data,
    isActive: parsed.data.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ data: staffUser }, 201);
});

staffRoutes.put("/:id", async (c) => {
  const payload = await c.req.json();
  const parsed = updateStaffSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", details: parsed.error.format() }, 400);
  }
  const db = getDb();
  const staffUser = await updateStaffUser(db, c.req.param("id"), {
    ...parsed.data,
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
