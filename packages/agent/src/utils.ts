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
 */
export const isConfirmationMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 32) {
    return false;
  }
  // Don't treat messages with numbers as confirmations (could be dates, times, player counts)
  if (/\d/.test(normalized)) {
    return false;
  }
  // Don't treat messages with edit/change intent as confirmations
  if (/(change|edit|update|instead|actually|but)/.test(normalized)) {
    return false;
  }
  return /^(yes|yep|yeah|y|ok|okay|confirm|confirmed|please do|do it|cancel it|sounds good|looks good|correct|that's right|that works)$/.test(
    normalized
  );
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
