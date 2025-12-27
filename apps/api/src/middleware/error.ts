import type { Context } from "hono";
import { logger } from "@tee-time/core";

export const errorHandler = (err: unknown, c: Context) => {
  const requestId = c.get("requestId");
  const message = err instanceof Error ? err.message : "Unexpected error";
  const status = 500;
  logger.error("api.error", { requestId, message });
  return c.json(
    {
      error: "Internal Server Error",
      message,
      requestId: requestId ?? null
    },
    status
  );
};
