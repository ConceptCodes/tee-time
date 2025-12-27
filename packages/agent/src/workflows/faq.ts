export type FaqFlowInput = {
  message: string;
  memberId?: string;
  locale?: string;
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

export const runFaqFlow = (input: FaqFlowInput): FaqFlowDecision => {
  const message = input.message?.trim();
  if (!message) {
    return { type: "clarify", prompt: DEFAULT_CLARIFY_PROMPT };
  }

  // TODO: wire embeddings + FAQ retrieval with confidence scoring.
  // For now, route to escalation so the workflow is deterministic and safe.
  return { type: "escalate", reason: "faq_not_implemented" };
};
