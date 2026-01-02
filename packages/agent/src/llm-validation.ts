import { z } from "zod";

/**
 * Validates LLM-generated results against a Zod schema.
 * Throws an error if validation fails.
 */
export function validateLLMResult<T extends z.ZodTypeAny>(
  result: unknown,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(result);
  } catch (error) {
    console.error("LLM result validation failed:", error);
    throw new Error("Invalid LLM response format");
  }
}

/**
 * Safely validates LLM results, returning null on failure instead of throwing.
 */
export function safeValidateLLMResult<T extends z.ZodTypeAny>(
  result: unknown,
  schema: T
): z.infer<T> | null {
  try {
    return schema.parse(result);
  } catch (error) {
    console.error("LLM result validation failed:", error);
    return null;
  }
}
