import type { MiddlewareHandler } from "hono";

export const loggingMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();
    const requestId = c.get("requestId");
    const start = c.get("requestStart");
    const durationMs = start ? Date.now() - start : undefined;
    const method = c.req.method;
    const path = c.req.path;
    const status = c.res.status;
    const message = [
      "request",
      requestId ? `id=${requestId}` : null,
      `${method} ${path}`,
      `status=${status}`,
      durationMs !== undefined ? `durationMs=${durationMs}` : null
    ]
      .filter(Boolean)
      .join(" ");
    console.log(message);
  };
};
