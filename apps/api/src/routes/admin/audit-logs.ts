import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@tee-time/database";
import { getAuditLogById, listAuditLogs } from "@tee-time/core";
import { paginatedResponse, parsePagination } from "../../pagination";

export const auditLogRoutes = new Hono<{ Variables: ApiVariables }>();

auditLogRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

auditLogRoutes.get("/", async (c) => {
  const actorId = c.req.query("actorId") ?? undefined;
  const resourceType = c.req.query("resourceType") ?? undefined;
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listAuditLogs(db, { actorId, resourceType, ...pagination });
  return c.json(paginatedResponse(result.data, pagination, result.total));
});

auditLogRoutes.get("/:id", async (c) => {
  const db = getDb();
  const log = await getAuditLogById(db, c.req.param("id"));
  if (!log) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: log });
});
