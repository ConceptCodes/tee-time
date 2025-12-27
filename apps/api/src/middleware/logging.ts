import type { MiddlewareHandler } from "hono";
import { logger } from "@syndicate/core";

export const loggingMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();
    const requestId = c.get("requestId");
    const start = c.get("requestStart");
    const durationMs = start ? Date.now() - start : undefined;
    const method = c.req.method;
    const path = c.req.path;
    const status = c.res.status;
    logger.info("api.request", {
      requestId,
      method,
      path,
      status,
      durationMs
    });
  };
};
