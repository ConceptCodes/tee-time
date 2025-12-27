import type { Context } from "hono";

export const errorHandler = (err: unknown, c: Context) => {
  const requestId = c.get("requestId");
  const message = err instanceof Error ? err.message : "Unexpected error";
  const status = 500;
  console.error("error", requestId ? `id=${requestId}` : null, message);
  return c.json(
    {
      error: "Internal Server Error",
      message,
      requestId: requestId ?? null
    },
    status
  );
};
