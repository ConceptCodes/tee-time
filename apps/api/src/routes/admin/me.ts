import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import { getCurrentUserProfile, updateCurrentUserProfile } from "@tee-time/core";
import { meSchemas } from "../../schemas";

export const meRoutes = new Hono<{ Variables: ApiVariables }>();

meRoutes.use("*", requireAuth(), requireRole(["admin", "staff", "member"]));

meRoutes.get("/", async (c) => {
  const session = c.get("session");
  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const db = getDb();
  const profile = await getCurrentUserProfile(db, {
    authUserId: session.user.id,
    email: session.user.email ?? null
  });
  return c.json({ data: profile });
});

meRoutes.put("/", validateJson(meSchemas.update), async (c) => {
  const session = c.get("session");
  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const parsed = c.get("validatedBody") as z.infer<typeof meSchemas.update>;
  const db = getDb();
  const updated = await updateCurrentUserProfile(db, {
    authUserId: session.user.id,
    email: session.user.email ?? null,
    data: { ...parsed, updatedAt: new Date() }
  });
  if (!updated) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: updated });
});
