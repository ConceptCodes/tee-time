import { z } from "zod";
import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateJson } from "../../middleware/validate";
import { getDb } from "@tee-time/database";
import { createBookingRepository } from "@tee-time/database";
import { bookingSchemas } from "../../schemas";
import { createBookingWithHistory, setBookingStatusWithHistory } from "@tee-time/core";
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
  const payload = c.get("validatedBody") as z.infer<typeof bookingSchemas.create>;
  const db = getDb();
  const now = new Date();
  try {
    const [year, month, day] = payload.preferredDate.split("-").map(Number);
    const preferredDate = new Date(year, month - 1, day);

    const booking = await createBookingWithHistory(db, {
      memberId: payload.memberId,
      clubId: payload.clubId,
      clubLocationId: payload.clubLocationId ?? null,
      bayId: payload.bayId ?? null,
      preferredDate,
      preferredTimeStart: payload.preferredTimeStart,
      preferredTimeEnd: payload.preferredTimeEnd ?? null,
      numberOfPlayers: payload.numberOfPlayers,
      guestNames: payload.guestNames,
      notes: payload.notes,
      status: payload.status ?? "Pending",
      staffMemberId: payload.staffMemberId ?? null,
      cancelledAt: payload.cancelledAt ? new Date(payload.cancelledAt) : null,
      notify: false,
      now
    });

    return c.json({ data: booking }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "bay_unavailable") {
      return c.json({ error: "No bays available for that location." }, 409);
    }
    throw error;
  }
});

bookingRoutes.put("/:id", validateJson(bookingSchemas.update), async (c) => {
  const payload = c.get("validatedBody") as z.infer<typeof bookingSchemas.update>;
  const db = getDb();
  const bookingRepo = createBookingRepository(db);
  const booking = await bookingRepo.update(c.req.param("id"), {
    ...payload,
    preferredDate: payload.preferredDate,
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
    const payload = c.get("validatedBody") as z.infer<typeof bookingSchemas.statusChange>;
    const db = getDb();
    const result = await setBookingStatusWithHistory(db, {
      bookingId: c.req.param("id"),
      nextStatus: "Confirmed",
      changedByStaffId: c.get("staffUser")?.id ?? null,
      reason: payload.reason ?? null,
      notifyMember: true, // Trigger WhatsApp notification to member
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
    const payload = c.get("validatedBody") as z.infer<typeof bookingSchemas.statusChange>;
    const db = getDb();
    const result = await setBookingStatusWithHistory(db, {
      bookingId: c.req.param("id"),
      nextStatus: "Not Available",
      changedByStaffId: c.get("staffUser")?.id ?? null,
      reason: payload.reason ?? null,
      notifyMember: true, // Trigger WhatsApp notification to member
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
    const payload = c.get("validatedBody") as z.infer<typeof bookingSchemas.statusChange>;
    const db = getDb();
    const result = await setBookingStatusWithHistory(db, {
      bookingId: c.req.param("id"),
      nextStatus: "Follow-up required",
      changedByStaffId: c.get("staffUser")?.id ?? null,
      reason: payload.reason ?? null,
      notifyMember: true, // Trigger WhatsApp notification to member
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
