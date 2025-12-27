import {
  createFaqRepository,
  type Database,
  faqEntries
} from "@tee-time/database";
import { logger } from "./logger";
import { embed } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { cosineDistance, desc, eq, gt, isNotNull, sql } from "drizzle-orm";

const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for FAQ retrieval.");
  }
  return createOpenRouter({ apiKey });
};

const getEmbeddingModelId = () =>
  process.env.OPENROUTER_EMBEDDING_MODEL_ID ?? "openai/text-embedding-3-small";

export const generateFaqEmbedding = async (question: string) => {
  const openrouter = getOpenRouterClient();
  const embeddingModelId = getEmbeddingModelId();
  const { embedding } = await embed({
    model: openrouter.textEmbeddingModel(embeddingModelId),
    value: question,
  });
  return embedding;
};

export const retrieveFaqAnswer = async (
  db: Database,
  question: string,
  options?: { minConfidence?: number; limit?: number }
) => {
  const repo = createFaqRepository(db);
  const count = await repo.countActive();
  if (count === 0) {
    return null;
  }

  const embedding = await generateFaqEmbedding(question);

  const similarity = sql<number>`1 - (${cosineDistance(
    faqEntries.embedding,
    embedding
  )})`;
  const minConfidence = options?.minConfidence ?? 0.6;
  const limit = options?.limit ?? 3;

  const matches = await db
    .select({
      id: faqEntries.id,
      question: faqEntries.question,
      answer: faqEntries.answer,
      confidence: similarity,
    })
    .from(faqEntries)
    .where(isNotNull(faqEntries.embedding))
    .where(eq(faqEntries.isActive, true))
    .where(gt(similarity, minConfidence))
    .orderBy(desc(similarity))
    .limit(limit);

  const match = matches[0];
  if (!match) {
    return null;
  }

  logger.info("core.faq.retrieve", {
    confidence: match.confidence,
  });

  return match;
};
