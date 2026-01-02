import type { Context } from "hono";
import { logger } from "@tee-time/core";

export const errorHandler = (err: unknown, c: Context) => {
  const requestId = c.get("requestId");
  const status = 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  logger.error("api.error", {
    requestId,
    message,
    stack: err instanceof Error ? err.stack : undefined
  });
  return c.json(
    {
      error: "Internal Server Error",
      requestId: requestId ?? null
    },
    status
  );
};
