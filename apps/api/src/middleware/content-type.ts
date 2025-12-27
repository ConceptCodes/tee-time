import type { MiddlewareHandler } from "hono";

export const contentTypeMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();
    if (!c.res.headers.has("content-type")) {
      c.res.headers.set("content-type", "application/json; charset=utf-8");
    }
  };
};
