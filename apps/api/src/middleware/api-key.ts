import type { MiddlewareHandler } from "hono";

/**
 * Validates API key from header for webhook endpoints.
 * Expects X-API-Key header matching WEBHOOK_API_KEY env variable.
 */
export const validateApiKey = (): MiddlewareHandler => {
  return async (c, next) => {
    const apiKey = c.req.header("x-api-key");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (!expectedKey) {
      console.warn("WEBHOOK_API_KEY not configured, allowing request");
      return next();
    }

    if (!apiKey || apiKey !== expectedKey) {
      return c.json({ error: "Invalid or missing API key" }, 401);
    }

    return next();
  };
};
