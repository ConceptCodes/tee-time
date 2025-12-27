import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@syndicate/database";
import {
  createBookingRepository,
  createBookingStatusHistoryRepository
} from "@syndicate/database";
import { bookingSchemas } from "../../schemas";
import { setBookingStatusWithHistory } from "@syndicate/core";
import { paginatedResponse, parsePagination } from "../../pagination";

export const bookingRoutes = new Hono<{ Variables: ApiVariables }>();

bookingRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

bookingRoutes.get("/", async (c) => {
  const statusParam = c.req.query("status");
  const status =
    statusParam === "Pending" ||
    statusParam === "Confirmed" ||
    statusParam === "Not Available" ||
    statusParam === "Cancelled" ||
    statusParam === "Follow-up required"
      ? statusParam
      : undefined;
  const pagination = parsePagination(c);
  if (!pagination) {
    return c.json({ error: "Invalid pagination" }, 400);
  }
  const db = getDb();
  const bookingRepo = createBookingRepository(db);
  const [bookings, total] = await Promise.all([
    bookingRepo.list({ status, ...pagination }),
    bookingRepo.count({ status })
  ]);
  return c.json(paginatedResponse(bookings, pagination, total));
});

bookingRoutes.get("/:id", async (c) => {
  const db = getDb();
  const bookingRepo = createBookingRepository(db);
  const booking = await bookingRepo.getById(c.req.param("id"));
  if (!booking) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: booking });
});

bookingRoutes.post("/", validateJson(bookingSchemas.create), async (c) => {
  const payload = c.get("validatedBody") as typeof bookingSchemas.create._type;
  const db = getDb();
  const now = new Date();
  const bookingRepo = createBookingRepository(db);
  const historyRepo = createBookingStatusHistoryRepository(db);
  const initialStatus = payload.status ?? "Pending";
  const booking = await bookingRepo.create({
    ...payload,
    preferredDate: new Date(payload.preferredDate),
    cancelledAt: payload.cancelledAt ? new Date(payload.cancelledAt) : null,
    status: initialStatus,
    createdAt: now,
    updatedAt: now
  });
  await historyRepo.create({
    bookingId: booking.id,
    previousStatus: initialStatus,
    nextStatus: initialStatus,
    changedByStaffId: payload.staffMemberId ?? null,
    reason: null,
    createdAt: now
  });
  return c.json({ data: booking }, 201);
});

bookingRoutes.put("/:id", validateJson(bookingSchemas.update), async (c) => {
  const payload = c.get("validatedBody") as typeof bookingSchemas.update._type;
  const db = getDb();
  const bookingRepo = createBookingRepository(db);
  const booking = await bookingRepo.update(c.req.param("id"), {
    ...payload,
    preferredDate: payload.preferredDate ? new Date(payload.preferredDate) : undefined,
    cancelledAt: payload.cancelledAt ? new Date(payload.cancelledAt) : undefined,
    updatedAt: new Date()
  });
  if (!booking) {
    return c.json({ error: "Not Found" }, 404);
  }
  return c.json({ data: booking });
});

bookingRoutes.post(
  "/:id/confirm",
  validateJson(bookingSchemas.statusChange),
  async (c) => {
    const payload = c.get("validatedBody") as typeof bookingSchemas.statusChange._type;
    const db = getDb();
    const result = await setBookingStatusWithHistory(db, {
      bookingId: c.req.param("id"),
      nextStatus: "Confirmed",
      changedByStaffId: c.get("staffUser")?.id ?? null,
      reason: payload.reason ?? null,
      audit: {
        actorId: c.get("staffUser")?.id ?? null,
        action: "booking.confirm",
        metadata: {}
      }
    });
    if (!result.booking) {
      return c.json({ error: "Not Found" }, 404);
    }
    return c.json({ data: result.booking });
  }
);

bookingRoutes.post(
  "/:id/reject",
  validateJson(bookingSchemas.statusChange),
  async (c) => {
    const payload = c.get("validatedBody") as typeof bookingSchemas.statusChange._type;
    const db = getDb();
    const result = await setBookingStatusWithHistory(db, {
      bookingId: c.req.param("id"),
      nextStatus: "Not Available",
      changedByStaffId: c.get("staffUser")?.id ?? null,
      reason: payload.reason ?? null,
      audit: {
        actorId: c.get("staffUser")?.id ?? null,
        action: "booking.reject",
        metadata: {}
      }
    });
    if (!result.booking) {
      return c.json({ error: "Not Found" }, 404);
    }
    return c.json({ data: result.booking });
  }
);

bookingRoutes.post(
  "/:id/request-info",
  validateJson(bookingSchemas.statusChange),
  async (c) => {
    const payload = c.get("validatedBody") as typeof bookingSchemas.statusChange._type;
    const db = getDb();
    const result = await setBookingStatusWithHistory(db, {
      bookingId: c.req.param("id"),
      nextStatus: "Follow-up required",
      changedByStaffId: c.get("staffUser")?.id ?? null,
      reason: payload.reason ?? null,
      audit: {
        actorId: c.get("staffUser")?.id ?? null,
        action: "booking.request_info",
        metadata: {}
      }
    });
    if (!result.booking) {
      return c.json({ error: "Not Found" }, 404);
    }
    return c.json({ data: result.booking });
  }
);
