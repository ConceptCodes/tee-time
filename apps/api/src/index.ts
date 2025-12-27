import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { errorHandler } from "./middleware/error";
import { contentTypeMiddleware } from "./middleware/content-type";
import { loggingMiddleware } from "./middleware/logging";
import { sessionMiddleware } from "./middleware/auth";
import { traceMiddleware } from "./middleware/trace";
import type { ApiVariables } from "./middleware/types";
import { staffRoutes } from "./routes/admin/staff";

const app = new Hono<{ Variables: ApiVariables }>();

app.use("*", traceMiddleware());
app.use("*", loggingMiddleware());
app.use("*", sessionMiddleware());
app.use("*", contentTypeMiddleware());
app.use(
  "/api/auth/*",
  cors({
    origin: process.env.ADMIN_APP_ORIGIN ?? "http://localhost:5173",
    credentials: true
  })
);
app.get("/health", (c) => c.json({ ok: true }));
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/staff-users", staffRoutes);
app.onError(errorHandler);

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

serve(
  {
    fetch: app.fetch,
    port
  },
  () => {
    console.log(`API server running on port ${port}`);
  }
);
