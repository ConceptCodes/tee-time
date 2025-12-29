import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@tee-time/database";
import {
  getAdminOverviewStats,
  getOverviewUiData,
  listRecentActivity
} from "@tee-time/core";

export const overviewRoutes = new Hono<{ Variables: ApiVariables }>();

overviewRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

overviewRoutes.get("/", async (c) => {
  const lookbackDays = c.req.query("lookbackDays")
    ? Number(c.req.query("lookbackDays"))
    : undefined;
  const recentLimit = c.req.query("recentLimit")
    ? Number(c.req.query("recentLimit"))
    : undefined;
  const upcomingLimit = c.req.query("upcomingLimit")
    ? Number(c.req.query("upcomingLimit"))
    : undefined;
  const pendingLimit = c.req.query("pendingLimit")
    ? Number(c.req.query("pendingLimit"))
    : undefined;
  if (lookbackDays !== undefined && Number.isNaN(lookbackDays)) {
    return c.json({ error: "Invalid lookbackDays" }, 400);
  }
  if (recentLimit !== undefined && Number.isNaN(recentLimit)) {
    return c.json({ error: "Invalid recentLimit" }, 400);
  }
  if (upcomingLimit !== undefined && Number.isNaN(upcomingLimit)) {
    return c.json({ error: "Invalid upcomingLimit" }, 400);
  }
  if (pendingLimit !== undefined && Number.isNaN(pendingLimit)) {
    return c.json({ error: "Invalid pendingLimit" }, 400);
  }
  const db = getDb();
  const [stats, recentActivity, ui] = await Promise.all([
    getAdminOverviewStats(db, { lookbackDays }),
    listRecentActivity(db, { limit: recentLimit }),
    getOverviewUiData(db, { lookbackDays, upcomingLimit, pendingLimit })
  ]);
  return c.json({ data: { stats, recentActivity, ui } });
});
