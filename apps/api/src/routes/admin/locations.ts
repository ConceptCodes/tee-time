import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import { deleteClubLocation, logAuditEvent, updateClubLocation } from "@tee-time/core";
import { clubLocationSchemas } from "../../schemas";

export const locationRoutes = new Hono<{ Variables: ApiVariables }>();

locationRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

const requireAdmin = (role: string | undefined) => role === "admin";

locationRoutes.put("/:id", validateJson(clubLocationSchemas.update), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const parsed = c.get("validatedBody") as z.infer<typeof clubLocationSchemas.update>;
  const db = getDb();
  const location = await updateClubLocation(db, c.req.param("id"), {
    ...parsed,
    updatedAt: new Date()
  });
  if (!location) {
    return c.json({ error: "Not Found" }, 404);
  }
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "club.location.update",
    resourceType: "club_location",
    resourceId: location.id,
    metadata: {}
  });
  return c.json({ data: location });
});

locationRoutes.delete("/:id", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const db = getDb();
  const location = await deleteClubLocation(db, c.req.param("id"));
  if (!location) {
    return c.json({ error: "Not Found" }, 404);
  }
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "club.location.delete",
    resourceType: "club_location",
    resourceId: location.id,
    metadata: {}
  });
  return c.json({ data: location });
});
