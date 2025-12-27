import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@tee-time/database";
import { listSupportRequests, resolveSupportRequest } from "@tee-time/core";
import { paginatedResponse, parsePagination } from "../../pagination";

export const supportRequestRoutes = new Hono<{ Variables: ApiVariables }>();

supportRequestRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

supportRequestRoutes.get("/", async (c) => {
  const status = c.req.query("status") ?? undefined;
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listSupportRequests(db, { status, ...pagination });
  return c.json(paginatedResponse(result.data, pagination, result.total));
});

supportRequestRoutes.put("/:id", async (c) => {
  const db = getDb();
  const request = await resolveSupportRequest(db, c.req.param("id"));
  if (!request) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: request });
});
