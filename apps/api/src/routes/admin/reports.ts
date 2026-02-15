import { Hono } from "hono";
import { z } from "zod";
import type { ApiVariables } from "../../middleware/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { reportSchemas } from "../../schemas";
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
reportRoutes.get(
  "/bookings-by-club",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getBookingsByClub(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

/**
 * Get conversion rate for a period.
 */
reportRoutes.get(
  "/conversion-rate",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getConversionRate(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

/**
 * Get average staff response time for a period.
 */
reportRoutes.get(
  "/response-time",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getAverageStaffResponseTime(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

/**
 * Get booking trend for a period.
 */
reportRoutes.get(
  "/booking-trend",
  validateQuery(z.object({ period: reportSchemas.period, groupBy: reportSchemas.groupBy })),
  async (c) => {
    const { period, groupBy } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year"; groupBy: "day" | "week" | "month" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getBookingTrend(db, dateRange, groupBy);
    return c.json({ data, period, groupBy, dateRange });
  }
);

/**
 * Get member activity stats for a period.
 */
reportRoutes.get(
  "/member-activity",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getMemberActivityStats(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

/**
 * Get request mix breakdown.
 */
reportRoutes.get(
  "/request-mix",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getRequestMix(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

/**
 * Get automation trend.
 */
reportRoutes.get(
  "/automation-trend",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getAutomationTrend(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

/**
 * Get conversion and response time trend.
 */
reportRoutes.get(
  "/conversion-trend",
  validateQuery(z.object({ period: reportSchemas.period })),
  async (c) => {
    const { period } = c.get("validatedQuery") as { period: "day" | "week" | "month" | "quarter" | "year" };
    const db = getDb();
    const dateRange = getDateRangeForPeriod(period);
    const data = await getConversionResponseTrend(db, dateRange);
    return c.json({ data, period, dateRange });
  }
);

  /**
   * Export bookings data as JSON (for spreadsheet export).
   */
  reportRoutes.get(
    "/export/bookings",
    validateQuery(z.object({ format: reportSchemas.dateRange })),
    async (c) => {
      const { start, end } = c.get("validatedQuery") as { start: string; end: string };
      const dateRange = {
        start: new Date(start),
        end: new Date(end),
      };

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

    const rows = data.map((row) =>
      [
        `"${String(row.bookingId ?? "").replace(/"/g, '""')}"`,
        `"${String(row.memberName ?? "").replace(/"/g, '""')}"`,
        `"${String(row.memberPhone ?? "").replace(/"/g, '""')}"`,
        `"${String(row.clubName ?? "").replace(/"/g, '""')}"`,
        `"${row.preferredDate ? new Date(row.preferredDate).toISOString() : ""}"`,
        `"${String(row.preferredTimeStart ?? "").replace(/"/g, '""')}"`,
        `"${String(row.numberOfPlayers ?? "").replace(/"/g, '""')}"`,
        `"${String(row.guestNames ?? "").replace(/"/g, '""')}"`,
        `"${String(row.notes ?? "").replace(/"/g, '""')}"`,
        `"${String(row.status ?? "").replace(/"/g, '""')}"`,
        `"${row.createdAt ? new Date(row.createdAt).toISOString() : ""}"`,
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

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
  reportRoutes.get(
    "/export/messages",
    validateQuery(z.object({ format: reportSchemas.dateRange })),
    async (c) => {
      const { start, end } = c.get("validatedQuery") as { start: string; end: string };
      const dateRange = {
        start: new Date(start),
        end: new Date(end),
      };

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

    const rows = data.map((row) =>
      [
        `"${String(row.id ?? "").replace(/"/g, '""')}"`,
        `"${String(row.memberName ?? "").replace(/"/g, '""')}"`,
        `"${String(row.direction ?? "").replace(/"/g, '""')}"`,
        `"${String(row.channel ?? "").replace(/"/g, '""')}"`,
        `"${(row.bodyRedacted ?? "").replace(/"/g, '""')}"`,
        `"${row.createdAt ? new Date(row.createdAt).toISOString() : ""}"`,
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    c.header("Content-Type", "text/csv");
    c.header(
      "Content-Disposition",
      `attachment; filename="messages-export-${dateRange.start.toISOString().slice(0, 10)}.csv"`
    );
    return c.body(csv);
  }

  return c.json({ data, dateRange });
});
