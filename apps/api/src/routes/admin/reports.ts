import { Hono } from "hono";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDb } from "@tee-time/database";
import {
  getMonthlyReport,
  getBookingsByClub,
  getConversionRate,
  getAverageStaffResponseTime,
  getBookingTrend,
  getMemberActivityStats,
  exportBookingsData,
  exportMessageLogs,
  getDateRangeForPeriod,
  getRequestMix,
  getAutomationTrend,
  getConversionResponseTrend,
  type ReportPeriod,
  type DateRange,
} from "@tee-time/core";

export const reportRoutes = new Hono<{ Variables: ApiVariables }>();

reportRoutes.use("*", requireAuth(), requireRole(["admin", "staff"]));

/**
 * Get monthly summary report.
 */
reportRoutes.get("/monthly/:year/:month", async (c) => {
  const year = parseInt(c.req.param("year"), 10);
  const month = parseInt(c.req.param("month"), 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return c.json({ error: "Invalid year or month" }, 400);
  }

  const db = getDb();
  const report = await getMonthlyReport(db, year, month);
  return c.json({ data: report });
});

/**
 * Get bookings by club for a period.
 */
reportRoutes.get("/bookings-by-club", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getBookingsByClub(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Get conversion rate for a period.
 */
reportRoutes.get("/conversion-rate", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getConversionRate(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Get average staff response time for a period.
 */
reportRoutes.get("/response-time", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getAverageStaffResponseTime(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Get booking trend for a period.
 */
reportRoutes.get("/booking-trend", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const groupBy = (c.req.query("groupBy") ?? "day") as "day" | "week" | "month";
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getBookingTrend(db, dateRange, groupBy);
  return c.json({ data, period, groupBy, dateRange });
});

/**
 * Get member activity stats for a period.
 */
reportRoutes.get("/member-activity", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getMemberActivityStats(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Get request mix breakdown.
 */
reportRoutes.get("/request-mix", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getRequestMix(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Get automation trend.
 */
reportRoutes.get("/automation-trend", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getAutomationTrend(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Get conversion and response time trend.
 */
reportRoutes.get("/conversion-trend", async (c) => {
  const period = (c.req.query("period") ?? "month") as ReportPeriod;
  const db = getDb();
  const dateRange = getDateRangeForPeriod(period);
  const data = await getConversionResponseTrend(db, dateRange);
  return c.json({ data, period, dateRange });
});

/**
 * Export bookings data as JSON (for spreadsheet export).
 */
reportRoutes.get("/export/bookings", async (c) => {
  const startParam = c.req.query("start");
  const endParam = c.req.query("end");

  let dateRange: DateRange;
  if (startParam && endParam) {
    dateRange = {
      start: new Date(startParam),
      end: new Date(endParam),
    };
  } else {
    dateRange = getDateRangeForPeriod("month");
  }

  const db = getDb();
  const data = await exportBookingsData(db, dateRange);

  // Check if CSV format is requested
  const format = c.req.query("format");
  if (format === "csv") {
    const headers = [
      "Booking ID",
      "Member Name",
      "Member Phone",
      "Club",
      "Date",
      "Time",
      "Players",
      "Guests",
      "Notes",
      "Status",
      "Created At",
    ];

    const rows = data.map((row) => [
      row.bookingId,
      row.memberName ?? "",
      row.memberPhone ?? "",
      row.clubName ?? "",
      String(row.preferredDate),
      row.preferredTimeStart,
      row.numberOfPlayers,
      row.guestNames ?? "",
      row.notes ?? "",
      row.status,
      row.createdAt ? new Date(row.createdAt).toISOString() : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    c.header("Content-Type", "text/csv");
    c.header(
      "Content-Disposition",
      `attachment; filename="bookings-export-${dateRange.start.toISOString().slice(0, 10)}.csv"`
    );
    return c.body(csv);
  }

  return c.json({ data, dateRange });
});

/**
 * Export message logs as JSON (for spreadsheet export).
 */
reportRoutes.get("/export/messages", async (c) => {
  const startParam = c.req.query("start");
  const endParam = c.req.query("end");

  let dateRange: DateRange;
  if (startParam && endParam) {
    dateRange = {
      start: new Date(startParam),
      end: new Date(endParam),
    };
  } else {
    dateRange = getDateRangeForPeriod("month");
  }

  const db = getDb();
  const data = await exportMessageLogs(db, dateRange);

  // Check if CSV format is requested
  const format = c.req.query("format");
  if (format === "csv") {
    const headers = [
      "Message ID",
      "Member Name",
      "Direction",
      "Channel",
      "Body",
      "Created At",
    ];

    const rows = data.map((row) => [
      row.id,
      row.memberName ?? "",
      row.direction,
      row.channel,
      `"${(row.bodyRedacted ?? "").replace(/"/g, '""')}"`,
      row.createdAt ? new Date(row.createdAt).toISOString() : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    c.header("Content-Type", "text/csv");
    c.header(
      "Content-Disposition",
      `attachment; filename="messages-export-${dateRange.start.toISOString().slice(0, 10)}.csv"`
    );
    return c.body(csv);
  }

  return c.json({ data, dateRange });
});
