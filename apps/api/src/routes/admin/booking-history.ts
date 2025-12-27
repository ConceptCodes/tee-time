import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@tee-time/database";
import { listBookingStatusHistory } from "@tee-time/core";
import { paginatedResponse, parsePagination } from "../../pagination";

export const bookingHistoryRoutes = new Hono<{ Variables: ApiVariables }>();

bookingHistoryRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

bookingHistoryRoutes.get("/:id/history", async (c) => {
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listBookingStatusHistory(db, c.req.param("id"), pagination);
  return c.json(paginatedResponse(result.data, pagination, result.total));
});
