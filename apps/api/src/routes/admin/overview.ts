import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@syndicate/database";
import { getAdminOverviewStats, listRecentActivity } from "@syndicate/core";

export const overviewRoutes = new Hono<{ Variables: ApiVariables }>();

overviewRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

overviewRoutes.get("/", async (c) => {
  const lookbackDays = c.req.query("lookbackDays")
    ? Number(c.req.query("lookbackDays"))
    : undefined;
  const recentLimit = c.req.query("recentLimit")
    ? Number(c.req.query("recentLimit"))
    : undefined;
  if (lookbackDays !== undefined && Number.isNaN(lookbackDays)) {
    return c.json({ error: "Invalid lookbackDays" }, 400);
  }
  if (recentLimit !== undefined && Number.isNaN(recentLimit)) {
    return c.json({ error: "Invalid recentLimit" }, 400);
  }
  const db = getDb();
  const [stats, recentActivity] = await Promise.all([
    getAdminOverviewStats(db, { lookbackDays }),
    listRecentActivity(db, { limit: recentLimit })
  ]);
  return c.json({ data: { stats, recentActivity } });
});
