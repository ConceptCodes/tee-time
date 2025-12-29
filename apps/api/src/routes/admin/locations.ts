import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import { deleteClubLocation, updateClubLocation } from "@tee-time/core";
import { clubLocationSchemas } from "../../schemas";

export const locationRoutes = new Hono<{ Variables: ApiVariables }>();

locationRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

locationRoutes.put("/:id", validateJson(clubLocationSchemas.update), async (c) => {
  const parsed = c.get("validatedBody") as z.infer<typeof clubLocationSchemas.update>;
  const db = getDb();
  const location = await updateClubLocation(db, c.req.param("id"), {
    ...parsed,
    updatedAt: new Date()
  });
  if (!location) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: location });
});

locationRoutes.delete("/:id", async (c) => {
  const db = getDb();
  const location = await deleteClubLocation(db, c.req.param("id"));
  if (!location) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: location });
});
