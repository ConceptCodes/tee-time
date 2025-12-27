import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@syndicate/database";
import { createClubLocation, listClubLocations, listClubs } from "@syndicate/core";
import { clubLocationSchemas } from "../../schemas";
import { paginatedResponse, parsePagination } from "../../pagination";

export const clubRoutes = new Hono<{ Variables: ApiVariables }>();

clubRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

clubRoutes.get("/", async (c) => {
  const activeOnly = c.req.query("activeOnly") === "true";
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listClubs(db, { activeOnly, ...pagination });
  return c.json(paginatedResponse(result.data, pagination, result.total));
});

clubRoutes.get("/:id/locations", async (c) => {
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listClubLocations(db, c.req.param("id"), pagination);
  return c.json(paginatedResponse(result.data, pagination, result.total));
});

clubRoutes.post(
  "/:id/locations",
  validateJson(clubLocationSchemas.create),
  async (c) => {
    const parsed = c.get("validatedBody") as typeof clubLocationSchemas.create._type;
  const db = getDb();
  const now = new Date();
  const location = await createClubLocation(db, {
    clubId: c.req.param("id"),
    name: parsed.name,
    address: parsed.address,
    locationPoint: parsed.locationPoint,
    isActive: parsed.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ data: location }, 201);
});
