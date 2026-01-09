/**
 * Shared utility functions for the agent package.
 */

import { getOpenRouterClient, resolveModelId } from "./provider";
import { generateObject } from "ai";
import { z } from "zod";
import { sanitizeUserInput } from "@tee-time/core";

// Cache for course correction detection to avoid repeated LLM calls
const COURSE_CORRECTION_CACHE = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Debug logging that only outputs when DEBUG environment variable is set.
 */
export const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.DEBUG) {
    console.log(`[Agent Debug] ${message}`, ...args);
  }
};

export const sanitizePromptInput = (message: string) => sanitizeUserInput(message);

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
    /that['']?s fine\b/,
    /fine by me\b/,
    /works for me\b/,
    /let['']?s do it\b/,
    /im good with that\b/,
    /i['']?m good with that\b/,
    /ye[pa][sp]? good/,
    /yeah sure/,
    /sounds perfect/,
    /looks perfect/,
    /works great/,
    /that['']?s perfect/,
    /roger that/,
    /copy that/,
    /make it happen/,
    /gotcha/,
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
      prompt: `Is this message a confirmation/agreement to proceed?\n\nUser message: "${sanitizePromptInput(message)}"`,
    });
    
    return result.object.isConfirmation;
  } catch {
    // Fallback to sync check if LLM fails
    return isConfirmationMessage(message);
  }
};

/**
 * Check if a message looks like a follow-up answer rather than a new intent.
 * Used by the router to determine if a short message should continue to current flow.
 * This is the original regex-based version for fast sync checks.
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
 * Check if a message is a negative reply (no, cancel, etc).
 */
export const isNegativeReply = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized.length > 32) {
    return false;
  }
  return /^(no|nope|nah|cancel|stop|never mind|nevermind|forget it)$/.test(
    normalized
  );
};

/**
 * Check if a message indicates user wants to skip a step.
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
 * LLM-based check to determine if a message is a follow-up answer rather than a new intent.
 * Used by the router to determine if a message should continue to current flow.
 * Returns true if the message appears to be answering a question, providing info, or continuing current task.
 */
export const looksLikeFollowupAsync = async (
  message: string,
  activeFlow?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<boolean> => {
  const normalized = message.trim().toLowerCase();

  // Fast path: very short messages without intent keywords are likely followups
  if (normalized.length <= 16) {
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
      "start",
      "begin",
      "need",
      "want",
    ];
    if (!intentKeywords.some((keyword) => normalized.includes(keyword))) {
      return true;
    }
  }

  // Fast path: check for explicit new intent indicators
  const newIntentPatterns = [
    /^(i want|i need|i'd like|can i|could i|help me|i want to|i need to)/i,
    /^(what about|how about|tell me about)/i,
  ];
  if (newIntentPatterns.some((pattern) => pattern.test(message))) {
    return false;
  }

  // LLM-based detection for ambiguous cases
  try {
    const client = getOpenRouterClient();
    const modelId = resolveModelId("default");

    const flowContext = activeFlow
      ? `\n\nCurrent active flow: ${activeFlow}\nRecent questions likely relate to this flow.`
      : "";
    const historyContext = conversationHistory?.length
      ? `\n\nRecent conversation:\n${conversationHistory.slice(-3).map((msg) => `${msg.role}: ${msg.content}`).join("\n")}`
      : "";

    const FollowupCheckSchema = z.object({
      isFollowup: z.boolean(),
      reason: z.string(),
    });

    const prompt = `You are analyzing if a user message is a follow-up to a previous conversation or a new intent.

User's message: "${sanitizePromptInput(message)}"${flowContext}${historyContext}

Determine if this message is:
1. A follow-up: Answering a question, providing requested info, continuing a task, or saying yes/no/cancel
2. A new intent: Starting a different task, asking a new question unrelated to current context

Return true only if it's clearly a follow-up. Be strict - if uncertain, return false.`;

    const result = await generateObject({
      model: client(modelId),
      schema: FollowupCheckSchema,
      prompt,
      temperature: 0.1,
    });

    const decision = result.object as z.infer<typeof FollowupCheckSchema>;
    debugLog(`🔍 LLM followup detection: ${decision.reason}`);

    return decision.isFollowup;
  } catch (error) {
    debugLog(`⚠ LLM followup detection failed: ${error}, falling back to regex`);
    // Fallback to original regex logic
    return looksLikeFollowup(message);
  }
};

export async function isCourseCorrection(message: string): Promise<boolean> {
  const trimmed = message.trim().toLowerCase();

  // Fast path: check cache
  const cached = COURSE_CORRECTION_CACHE.get(trimmed);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    debugLog("Course correction cache hit");
    return cached.result;
  }

  const correctionPatterns = [
    "wait",
    "actually",
    "never mind",
    "nevermind",
    "forget it",
    "cancel that",
    "ignore that",
    "stop",
    "wrong",
    "i changed my mind",
    "change of plans",
    "on second thought",
    "i meant",
    "i didn't mean",
    "not that",
    "let me start over",
    "scratch that",
    "disregard",
  ];

  const hasCorrectionPattern = correctionPatterns.some((pattern) =>
    trimmed.includes(pattern),
  );

  if (!hasCorrectionPattern) {
    return false;
  }

  const actionVerbs = [
    "book",
    "reserve",
    "cancel",
    "change",
    "modify",
    "update",
    "reschedule",
    "move",
    "check",
    "see",
    "show",
  ];

  const hasActionVerb = actionVerbs.some((verb) => trimmed.includes(verb));

  if (hasActionVerb && trimmed.length > 50) {
    return false;
  }

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const { generateObject: genObj } = await import("ai");
    const { z: zod } = await import("zod");
    const { withRetry } = await import("./retry-utils");
    
    // Wrap LLM call with retry logic
    const result = await withRetry(
      () => genObj({
        model: openrouter.chat(modelId),
        schema: zod.object({
          isCorrection: zod.boolean(),
        }),
        prompt: `Analyze this message to determine if it's a mid-course correction (user wants to change their mind or stop what they're doing):

Message: "${sanitizePromptInput(message)}"

Consider:
- Is user signaling they want to stop or change what they just said?
- Is this a natural part of a multi-step flow or an interruption?
- Does it indicate they want to start over or try something different?

Return true if it's a course correction/interruption, false if it's just part of normal flow.`,
        temperature: 0.1,
      }),
      { maxRetries: 2, baseDelay: 500 }
    );

    const isCorrection = result.object.isCorrection;
    
    // Cache result
    COURSE_CORRECTION_CACHE.set(trimmed, { result: isCorrection, timestamp: Date.now() });

    debugLog("isCourseCorrection", {
      message,
      isCorrection,
    });

    return isCorrection;
  } catch (error) {
    debugLog("isCourseCorrection error", { error });
    return hasCorrectionPattern;
  }
}


