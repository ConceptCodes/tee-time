import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@syndicate/database";
import { createFaqRepository } from "@syndicate/database";
import { generateFaqEmbedding } from "@syndicate/core";
import { faqSchemas } from "../../schemas";
import { paginatedResponse, parsePagination } from "../../pagination";

export const faqRoutes = new Hono<{ Variables: ApiVariables }>();

faqRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

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
  const payload = c.get("validatedBody") as typeof faqSchemas.create._type;
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
  return c.json({ data: faq }, 201);
});

faqRoutes.put("/:id", validateJson(faqSchemas.update), async (c) => {
  const payload = c.get("validatedBody") as typeof faqSchemas.update._type;
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
  return c.json({ data: faq });
});

faqRoutes.delete("/:id", async (c) => {
  const db = getDb();
  const repo = createFaqRepository(db);
  const faq = await repo.update(c.req.param("id"), {
    isActive: false,
    updatedAt: new Date()
  });
  if (!faq) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: faq });
});
