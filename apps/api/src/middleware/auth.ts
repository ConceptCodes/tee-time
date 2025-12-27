import type { MiddlewareHandler } from "hono";
import { getDb } from "@tee-time/database";
import { createStaffRepository } from "@tee-time/database";
import { auth } from "../auth";

export const sessionMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });
    c.set("session", session ?? null);

    if (session?.user?.id) {
      const staffRepo = createStaffRepository(getDb());
      const staffUser = await staffRepo.getByAuthUserId(session.user.id);
      c.set("staffUser", staffUser ?? null);
    } else {
      c.set("staffUser", null);
    }

    await next();
  };
};

export const requireAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const session = c.get("session");
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return next();
  };
};

export const requireRole = (
  roles: Array<"admin" | "staff" | "member">
): MiddlewareHandler => {
  return async (c, next) => {
    const staffUser = c.get("staffUser");
    if (!staffUser || !roles.includes(staffUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return next();
  };
};
