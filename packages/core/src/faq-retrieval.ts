import { and, cosineDistance, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { embed } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  createFaqRepository,
  type Database,
  faqEntries,
} from "@tee-time/database";
import { env } from "@tee-time/config";
import { logger } from "./logger";

const getOpenRouterClient = () => {
  return createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
};

export const generateFaqEmbedding = async (question: string) => {
  const openrouter = getOpenRouterClient();
  const { embedding } = await embed({
    model: openrouter.textEmbeddingModel(env.OPENROUTER_EMBEDDING_MODEL_ID),
    value: question,
  });
  return embedding;
};

export const retrieveFaqCandidates = async (
  db: Database,
  question: string,
  options?: { minConfidence?: number; limit?: number },
) => {
  const repo = createFaqRepository(db);
  const count = await repo.countActive();
  if (count === 0) {
    return null;
  }

  const embedding = await generateFaqEmbedding(question);

  const similarity = sql<number>`1 - (${cosineDistance(
    faqEntries.embedding,
    embedding,
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
    .where(
      and(
        isNotNull(faqEntries.embedding),
        eq(faqEntries.isActive, true),
        gt(similarity, minConfidence),
      ),
    )
    .orderBy(desc(similarity))
    .limit(limit);

  return matches;
};

export const retrieveFaqAnswer = async (
  db: Database,
  question: string,
  options?: { minConfidence?: number; limit?: number },
) => {
  const matches = await retrieveFaqCandidates(db, question, options);
  if (!matches) {
    return null;
  }
  const match = matches[0];
  if (!match) {
    return null;
  }

  logger.info("core.faq.retrieve", {
    confidence: match.confidence,
  });

  return match;
};
