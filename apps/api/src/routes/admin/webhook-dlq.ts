import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb, createWebhookDlqRepository } from "@tee-time/database";
import { paginatedResponse, parsePagination } from "../../pagination";

export const webhookDlqRoutes = new Hono<{ Variables: ApiVariables }>();

webhookDlqRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

const requireAdmin = (role: string | undefined) => role === "admin";

webhookDlqRoutes.get("/", async (c) => {
  const status = c.req.query("status") ?? undefined;
  const provider = c.req.query("provider") ?? undefined;
  const eventType = c.req.query("eventType") ?? undefined;
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }

  const db = getDb();
  const repo = createWebhookDlqRepository(db);
  const [data, total] = await Promise.all([
    repo.list({
      status,
      provider,
      eventType,
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    repo.count({ status, provider, eventType }),
  ]);

  return c.json(paginatedResponse(data, pagination, total));
});

webhookDlqRoutes.post("/:id/retry", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const db = getDb();
  const repo = createWebhookDlqRepository(db);
  const existing = await repo.getById(c.req.param("id"));
  if (!existing) {
    return c.json({ error: "Not Found" }, 404);
  }

  const now = new Date();
  const updated = await repo.update(existing.id, {
    status: "pending",
    nextRetryAt: now,
    updatedAt: now,
  });

  return c.json({ data: updated });
});

webhookDlqRoutes.post("/:id/resolve", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const db = getDb();
  const repo = createWebhookDlqRepository(db);
  const existing = await repo.getById(c.req.param("id"));
  if (!existing) {
    return c.json({ error: "Not Found" }, 404);
  }

  const now = new Date();
  const updated = await repo.update(existing.id, {
    status: "resolved",
    updatedAt: now,
  });

  return c.json({ data: updated });
});
