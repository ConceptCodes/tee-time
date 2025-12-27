import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@syndicate/database";
import { listMessageLogs } from "@syndicate/core";
import { paginatedResponse, parsePagination } from "../../pagination";

export const messageLogRoutes = new Hono<{ Variables: ApiVariables }>();

messageLogRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

messageLogRoutes.get("/", async (c) => {
  const memberId = c.req.query("memberId") ?? undefined;
  const directionParam = c.req.query("direction");
  const channelParam = c.req.query("channel");
  const direction =
    directionParam === "inbound" || directionParam === "outbound"
      ? directionParam
      : undefined;
  const channel =
    channelParam === "whatsapp" || channelParam === "slack" || channelParam === "email"
      ? channelParam
      : undefined;
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const result = await listMessageLogs(db, {
    memberId,
    direction,
    channel,
    ...pagination
  });
  return c.json(paginatedResponse(result.data, pagination, result.total));
});
