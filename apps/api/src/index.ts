import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "./auth";

import { errorHandler } from "./middleware/error";
import { contentTypeMiddleware } from "./middleware/content-type";
import { loggingMiddleware } from "./middleware/logging";
import { sessionMiddleware } from "./middleware/auth";
import { traceMiddleware } from "./middleware/trace";
import type { ApiVariables } from "./middleware/types";

import { getDb } from "@tee-time/database";

import { staffRoutes } from "./routes/admin/staff";
import { meRoutes } from "./routes/admin/me";
import { clubRoutes } from "./routes/admin/clubs";
import { locationRoutes } from "./routes/admin/locations";
import { memberRoutes } from "./routes/admin/members";
import { overviewRoutes } from "./routes/admin/overview";
import { supportRequestRoutes } from "./routes/admin/support-requests";
import { auditLogRoutes } from "./routes/admin/audit-logs";
import { messageLogRoutes } from "./routes/admin/message-logs";
import { bookingHistoryRoutes } from "./routes/admin/booking-history";
import { bookingRoutes } from "./routes/admin/bookings";
import { faqRoutes } from "./routes/admin/faqs";
import { reportRoutes } from "./routes/admin/reports";
import { whatsappWebhookRoutes } from "./routes/webhooks/whatsapp";

const app = new Hono<{ Variables: ApiVariables }>();

app.get('/', (c) => {
  return c.text("Hello World")
})

app.use("*", traceMiddleware());
app.use("*", loggingMiddleware());
app.use("*", sessionMiddleware());
app.use("*", contentTypeMiddleware());
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigin = process.env.ADMIN_APP_ORIGIN ?? "http://localhost:5173";
      // Allow the specific origin or any origin if it matches the pattern (for development flexibility)
      if (origin === allowedOrigin || !origin) return origin;
      return allowedOrigin;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);
app.get("/health", (c) => c.json({ ok: true }));
app.get("/ready", async (c) => {
  const checks: Record<string, { ok: boolean; error?: string }> = {};
  try {
    const db = getDb();
    await db.execute("select 1");
    checks.database = { ok: true };
  } catch (error) {
    checks.database = { ok: false, error: (error as Error).message };
  }
  const ok = Object.values(checks).every((check) => check.ok);
  return c.json({ ok, checks }, ok ? 200 : 503);
});
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/staff-users", staffRoutes);
app.route("/api/me", meRoutes);
app.route("/api/clubs", clubRoutes);
app.route("/api/locations", locationRoutes);
app.route("/api/members", memberRoutes);
app.route("/api/admin/overview", overviewRoutes);
app.route("/api/support-requests", supportRequestRoutes);
app.route("/api/audit-logs", auditLogRoutes);
app.route("/api/message-logs", messageLogRoutes);
app.route("/api/bookings", bookingRoutes); // NOTE: why two?
app.route("/api/bookings", bookingHistoryRoutes);
app.route("/api/faqs", faqRoutes);
app.route("/api/reports", reportRoutes);
app.route("/webhooks/whatsapp", whatsappWebhookRoutes);
app.onError(errorHandler);

export default app;