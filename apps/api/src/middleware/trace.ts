import type { MiddlewareHandler } from "hono";

export const traceMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    const start = Date.now();
    c.set("requestStart", start);
    await next();
    c.res.headers.set("x-request-id", requestId);
  };
};
