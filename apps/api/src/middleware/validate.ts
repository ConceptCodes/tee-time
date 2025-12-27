import type { MiddlewareHandler } from "hono";
import type { ZodSchema } from "zod";

export const validateJson = <T>(schema: ZodSchema<T>): MiddlewareHandler => {
  return async (c, next) => {
    const contentType = c.req.header("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return c.json({ error: "Content-Type must be application/json" }, 415);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid payload", details: parsed.error.format() }, 400);
    }
    c.set("validatedBody", parsed.data);
    await next();
  };
};
