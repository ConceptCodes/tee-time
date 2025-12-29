/**
 * Shared utility functions for the agent package.
 */

/**
 * Debug logging that only outputs when DEBUG environment variable is set.
 */
export const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.DEBUG) {
    console.log(`[Agent Debug] ${message}`, ...args);
  }
};

/**
 * Check if a message is a simple confirmation/affirmative response.
 * Used across multiple workflows to detect when users confirm actions.
 * This is a fast synchronous check for obvious cases.
 */
export const isConfirmationMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 80) {
    return false;
  }
  // Don't treat messages with numbers as confirmations (could be dates, times, player counts)
  if (/\d/.test(normalized)) {
    return false;
  }
  // Don't treat messages with edit/change intent as confirmations
  if (/(change|edit|update|instead|actually|but|wait|hold|cancel|different)/.test(normalized)) {
    return false;
  }
  // Exact matches for short responses (fast path)
  if (/^(yes|yep|yeah|y|ok|okay|confirm|confirmed|please|sure|yup|affirmative|no|nope|nah)$/.test(normalized)) {
    return /^(yes|yep|yeah|y|ok|okay|confirm|confirmed|please|sure|yup|affirmative)$/.test(normalized);
  }
  // For longer messages, check for common confirmation patterns
  const confirmPatterns = [
    /\b(sounds? good|looks? good|that works?|go ahead|do it|book it|perfect|great|awesome)\b/,
    /^(correct|right|exactly|absolutely|definitely|for sure)$/,
  ];
  return confirmPatterns.some(pattern => pattern.test(normalized));
};

/**
 * Async LLM-based confirmation detection for natural language.
 * Falls back to regex if LLM is unavailable.
 */
export const isConfirmationMessageAsync = async (message: string): Promise<boolean> => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 200) {
    return false;
  }
  
  // Fast path for obvious cases
  if (/^(yes|yep|yeah|y|ok|okay|confirm|confirmed|sure|yup)$/.test(normalized)) {
    return true;
  }
  if (/^(no|nope|nah|cancel|stop)$/.test(normalized)) {
    return false;
  }
  // Don't treat messages with numbers as confirmations (could be new details)
  if (/\d/.test(normalized)) {
    return false;
  }
  // Don't treat messages with edit/change intent as confirmations
  if (/(change|edit|update|instead|actually|but|wait|hold|different)/.test(normalized)) {
    return false;
  }

  try {
    const { generateObject } = await import("ai");
    const { z } = await import("zod");
    const { getOpenRouterClient, resolveModelId } = await import("./provider");
    
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: z.object({
        isConfirmation: z.boolean(),
      }),
      system: "You are analyzing if a user's message is confirming/agreeing to proceed with an action. " +
        "Return true if the message expresses agreement, approval, or confirmation. " +
        "Return false if it's a question, request for changes, new information, or decline.",
      prompt: `Is this message a confirmation/agreement to proceed?\n\nUser message: "${message}"`,
    });
    
    return result.object.isConfirmation;
  } catch {
    // Fallback to sync check if LLM fails
    return isConfirmationMessage(message);
  }
};

/**
 * Check if a message is a negative/declining response.
 * Used to detect when users decline offers or suggestions.
 */
export const isNegativeReply = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 32) {
    return false;
  }
  return /^(no|nope|nah|not now|not today|later|maybe later|don't|do not)$/.test(
    normalized
  );
};

/**
 * Check if a message indicates the user wants to skip a step.
 */
export const isSkipReply = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 32) {
    return false;
  }
  return /^(skip|skip it|skip this|skip for now|no thanks|no thank you|later|not now)$/.test(
    normalized
  );
};

/**
 * Check if a message looks like a follow-up answer rather than a new intent.
 * Used by the router to determine if a short message should continue the current flow.
 */
export const looksLikeFollowup = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 32) {
    return false;
  }
  const intentKeywords = [
    "book",
    "tee time",
    "cancel",
    "reschedule",
    "modify",
    "change",
    "status",
    "support",
    "help",
    "human",
    "faq",
    "question",
  ];
  if (intentKeywords.some((keyword) => normalized.includes(keyword))) {
    return false;
  }
  return true;
};

/**
 * Normalize a value for case-insensitive, punctuation-free matching.
 * Used for matching club names, locations, bays, etc.
 */
export const normalizeMatchValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
