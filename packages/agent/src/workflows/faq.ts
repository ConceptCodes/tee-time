import type { Database } from "@tee-time/database";
import { retrieveFaqAnswer } from "@tee-time/core";

export type FaqFlowInput = {
  message: string;
  memberId?: string;
  locale?: string;
  db?: Database;
};

export type FaqFlowDecision =
  | {
      type: "answer";
      answer: string;
      confidence?: number;
    }
  | {
      type: "clarify";
      prompt: string;
    }
  | {
      type: "escalate";
      reason: string;
    };

const DEFAULT_CLARIFY_PROMPT =
  "I can help with tee times, membership, or club info. What would you like to know?";

export type FaqFlowRuntime = {
  getFaqAnswer?: (question: string) => Promise<{
    answer: string;
    confidence: number;
  } | null>;
};

export const runFaqFlow = async (
  input: FaqFlowInput,
  runtime: FaqFlowRuntime = {}
): Promise<FaqFlowDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return { type: "clarify", prompt: DEFAULT_CLARIFY_PROMPT };
  }

  const getAnswer =
    runtime.getFaqAnswer ??
    (input.db
      ? (question: string) => retrieveFaqAnswer(input.db as Database, question)
      : undefined);
  if (!getAnswer) {
    return { type: "escalate", reason: "faq_unavailable" };
  }

  const result = await getAnswer(message);
  if (!result || result.confidence < 0.6) {
    return { type: "escalate", reason: "faq_low_confidence" };
  }

  return {
    type: "answer",
    answer: result.answer,
    confidence: result.confidence,
  };
};
