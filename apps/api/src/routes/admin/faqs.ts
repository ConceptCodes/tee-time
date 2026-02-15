import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import { createFaqRepository } from "@tee-time/database";
import { generateFaqEmbedding, logAuditEvent } from "@tee-time/core";
import { faqSchemas } from "../../schemas";
import { paginatedResponse, parsePagination } from "../../pagination";

export const faqRoutes = new Hono<{ Variables: ApiVariables }>();

faqRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

const requireAdmin = (role: string | undefined) => role === "admin";

faqRoutes.get("/", async (c) => {
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const repo = createFaqRepository(db);
  const [faqs, total] = await Promise.all([
    repo.listActive(pagination),
    repo.countActive()
  ]);
  return c.json(paginatedResponse(faqs, pagination, total));
});

faqRoutes.post("/", validateJson(faqSchemas.create), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const payload = c.get("validatedBody") as z.infer<typeof faqSchemas.create>;
  const now = new Date();
  const db = getDb();
  const repo = createFaqRepository(db);
  const embedding = await generateFaqEmbedding(payload.question);
  const faq = await repo.create({
    ...payload,
    tags: payload.tags ?? [],
    embedding,
    embeddingUpdatedAt: now,
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now
  });
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "faq.create",
    resourceType: "faq_entry",
    resourceId: faq.id,
    metadata: {}
  });
  return c.json({ data: faq }, 201);
});

faqRoutes.put("/:id", validateJson(faqSchemas.update), async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const payload = c.get("validatedBody") as z.infer<typeof faqSchemas.update>;
  const db = getDb();
  const repo = createFaqRepository(db);
  const embedding =
    payload.question ? await generateFaqEmbedding(payload.question) : undefined;
  const faq = await repo.update(c.req.param("id"), {
    ...payload,
    embedding,
    embeddingUpdatedAt: embedding ? new Date() : undefined,
    updatedAt: new Date()
  });
  if (!faq) {
    return c.json({ error: "Not Found" }, 404);
  }
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "faq.update",
    resourceType: "faq_entry",
    resourceId: faq.id,
    metadata: {}
  });
  return c.json({ data: faq });
});

faqRoutes.delete("/:id", async (c) => {
  if (!requireAdmin(c.get("staffUser")?.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const db = getDb();
  const repo = createFaqRepository(db);
  const faq = await repo.update(c.req.param("id"), {
    isActive: false,
    updatedAt: new Date()
  });
  if (!faq) {
    return c.json({ error: "Not Found" }, 404);
  }
  await logAuditEvent(db, {
    actorId: c.get("staffUser")?.id ?? null,
    action: "faq.disable",
    resourceType: "faq_entry",
    resourceId: faq.id,
    metadata: {}
  });
  return c.json({ data: faq });
});
