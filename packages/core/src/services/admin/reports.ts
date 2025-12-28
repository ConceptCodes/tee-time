import type { Database } from "@tee-time/database";
import {
  createBookingRepository,
  createBookingStatusHistoryRepository,
  bookings,
  bookingStatusHistory,
  clubs,
  memberProfiles,
  messageLogs,
} from "@tee-time/database";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";
import { logger } from "../../logger";

export type ReportPeriod = "day" | "week" | "month" | "quarter" | "year";

export type DateRange = {
  start: Date;
  end: Date;
};

/**
 * Get date range for a given period.
 */
export const getDateRangeForPeriod = (
  period: ReportPeriod,
  referenceDate = new Date()
): DateRange => {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
      // Same day
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
};

/**
 * Get bookings grouped by club for the given date range.
 */
export const getBookingsByClub = async (
  db: Database,
  dateRange: DateRange
) => {
  const results = await db
    .select({
      clubId: bookings.clubId,
      clubName: clubs.name,
      total: sql<number>`count(*)`,
      confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'Confirmed')`,
      pending: sql<number>`count(*) filter (where ${bookings.status} = 'Pending')`,
      notAvailable: sql<number>`count(*) filter (where ${bookings.status} = 'Not Available')`,
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'Cancelled')`,
    })
    .from(bookings)
    .leftJoin(clubs, eq(bookings.clubId, clubs.id))
    .where(
      and(
        gte(bookings.createdAt, dateRange.start),
        lte(bookings.createdAt, dateRange.end)
      )
    )
    .groupBy(bookings.clubId, clubs.name)
    .orderBy(desc(sql`count(*)`));

  logger.info("core.reports.bookingsByClub", {
    start: dateRange.start.toISOString(),
    end: dateRange.end.toISOString(),
    clubCount: results.length,
  });

  return results.map((row) => ({
    clubId: row.clubId,
    clubName: row.clubName ?? "Unknown",
    total: Number(row.total),
    confirmed: Number(row.confirmed),
    pending: Number(row.pending),
    notAvailable: Number(row.notAvailable),
    cancelled: Number(row.cancelled),
    conversionRate:
      Number(row.total) > 0
        ? Number((Number(row.confirmed) / Number(row.total)).toFixed(4))
        : 0,
  }));
};

/**
 * Get overall conversion rate (confirmed / total) for the given date range.
 */
export const getConversionRate = async (
  db: Database,
  dateRange: DateRange
) => {
  const results = await db
    .select({
      total: sql<number>`count(*)`,
      confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'Confirmed')`,
      notAvailable: sql<number>`count(*) filter (where ${bookings.status} = 'Not Available')`,
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'Cancelled')`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, dateRange.start),
        lte(bookings.createdAt, dateRange.end)
      )
    );

  const row = results[0];
  const total = Number(row?.total ?? 0);
  const confirmed = Number(row?.confirmed ?? 0);
  const notAvailable = Number(row?.notAvailable ?? 0);
  const cancelled = Number(row?.cancelled ?? 0);

  logger.info("core.reports.conversionRate", {
    start: dateRange.start.toISOString(),
    end: dateRange.end.toISOString(),
    total,
    confirmed,
  });

  return {
    total,
    confirmed,
    notAvailable,
    cancelled,
    conversionRate: total > 0 ? Number((confirmed / total).toFixed(4)) : 0,
    lossRate:
      total > 0
        ? Number(((notAvailable + cancelled) / total).toFixed(4))
        : 0,
  };
};

/**
 * Calculate average staff response time (time from Pending to first status change).
 */
export const getAverageStaffResponseTime = async (
  db: Database,
  dateRange: DateRange
) => {
  // Get all bookings in the date range that have been actioned
  const results = await db
    .select({
      bookingId: bookingStatusHistory.bookingId,
      bookingCreatedAt: bookings.createdAt,
      firstActionAt: sql<Date>`min(${bookingStatusHistory.createdAt})`,
    })
    .from(bookingStatusHistory)
    .innerJoin(bookings, eq(bookingStatusHistory.bookingId, bookings.id))
    .where(
      and(
        gte(bookings.createdAt, dateRange.start),
        lte(bookings.createdAt, dateRange.end),
        eq(bookingStatusHistory.previousStatus, "Pending")
      )
    )
    .groupBy(bookingStatusHistory.bookingId, bookings.createdAt);

  if (results.length === 0) {
    return {
      averageMinutes: 0,
      averageHours: 0,
      sampleSize: 0,
      fastestMinutes: 0,
      slowestMinutes: 0,
    };
  }

  const responseTimes = results.map((row) => {
    const created = new Date(row.bookingCreatedAt as unknown as string);
    const actioned = new Date(row.firstActionAt as unknown as string);
    return (actioned.getTime() - created.getTime()) / (1000 * 60); // minutes
  });

  const sum = responseTimes.reduce((a, b) => a + b, 0);
  const avg = sum / responseTimes.length;
  const fastest = Math.min(...responseTimes);
  const slowest = Math.max(...responseTimes);

  logger.info("core.reports.avgResponseTime", {
    start: dateRange.start.toISOString(),
    end: dateRange.end.toISOString(),
    sampleSize: results.length,
    averageMinutes: avg,
  });

  return {
    averageMinutes: Number(avg.toFixed(2)),
    averageHours: Number((avg / 60).toFixed(2)),
    sampleSize: results.length,
    fastestMinutes: Number(fastest.toFixed(2)),
    slowestMinutes: Number(slowest.toFixed(2)),
  };
};

/**
 * Get booking trend data grouped by day/week/month.
 */
export const getBookingTrend = async (
  db: Database,
  dateRange: DateRange,
  groupBy: "day" | "week" | "month" = "day"
) => {
  const dateTrunc = groupBy === "month" ? "month" : groupBy === "week" ? "week" : "day";

  const results = await db
    .select({
      period: sql<string>`date_trunc(${dateTrunc}, ${bookings.createdAt})::date`,
      total: sql<number>`count(*)`,
      confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'Confirmed')`,
      pending: sql<number>`count(*) filter (where ${bookings.status} = 'Pending')`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, dateRange.start),
        lte(bookings.createdAt, dateRange.end)
      )
    )
    .groupBy(sql`date_trunc(${dateTrunc}, ${bookings.createdAt})::date`)
    .orderBy(sql`date_trunc(${dateTrunc}, ${bookings.createdAt})::date`);

  return results.map((row) => ({
    period: row.period,
    total: Number(row.total),
    confirmed: Number(row.confirmed),
    pending: Number(row.pending),
    conversionRate:
      Number(row.total) > 0
        ? Number((Number(row.confirmed) / Number(row.total)).toFixed(4))
        : 0,
  }));
};

/**
 * Get member activity stats.
 */
export const getMemberActivityStats = async (
  db: Database,
  dateRange: DateRange
) => {
  const results = await db
    .select({
      totalMembers: sql<number>`count(distinct ${bookings.memberId})`,
      avgBookingsPerMember: sql<number>`count(*)::float / nullif(count(distinct ${bookings.memberId}), 0)`,
      repeatBookers: sql<number>`count(*) filter (where ${bookings.memberId} in (
        select member_id from bookings 
        where created_at >= ${dateRange.start} and created_at <= ${dateRange.end}
        group by member_id having count(*) > 1
      ))`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, dateRange.start),
        lte(bookings.createdAt, dateRange.end)
      )
    );

  const row = results[0];
  return {
    totalMembers: Number(row?.totalMembers ?? 0),
    avgBookingsPerMember: Number((row?.avgBookingsPerMember ?? 0).toFixed(2)),
    repeatBookerCount: Number(row?.repeatBookers ?? 0),
  };
};

/**
 * Get full monthly summary report.
 */
export const getMonthlyReport = async (
  db: Database,
  year: number,
  month: number
) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const dateRange: DateRange = { start, end };

  const [byClub, conversion, responseTime, trend, memberActivity] =
    await Promise.all([
      getBookingsByClub(db, dateRange),
      getConversionRate(db, dateRange),
      getAverageStaffResponseTime(db, dateRange),
      getBookingTrend(db, dateRange, "day"),
      getMemberActivityStats(db, dateRange),
    ]);

  logger.info("core.reports.monthlyReport", {
    year,
    month,
    totalBookings: conversion.total,
    conversionRate: conversion.conversionRate,
  });

  return {
    period: {
      year,
      month,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    summary: {
      totalBookings: conversion.total,
      confirmedBookings: conversion.confirmed,
      conversionRate: conversion.conversionRate,
      lossRate: conversion.lossRate,
      avgResponseTimeMinutes: responseTime.averageMinutes,
      avgResponseTimeHours: responseTime.averageHours,
    },
    byClub,
    memberActivity,
    dailyTrend: trend,
  };
};

/**
 * Export bookings data for a given date range (for spreadsheet export).
 */
export const exportBookingsData = async (
  db: Database,
  dateRange: DateRange
) => {
  const results = await db
    .select({
      bookingId: bookings.id,
      memberId: bookings.memberId,
      memberName: memberProfiles.name,
      memberPhone: memberProfiles.phoneNumber,
      clubId: bookings.clubId,
      clubName: clubs.name,
      preferredDate: bookings.preferredDate,
      preferredTimeStart: bookings.preferredTimeStart,
      preferredTimeEnd: bookings.preferredTimeEnd,
      numberOfPlayers: bookings.numberOfPlayers,
      guestNames: bookings.guestNames,
      notes: bookings.notes,
      status: bookings.status,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
    })
    .from(bookings)
    .leftJoin(clubs, eq(bookings.clubId, clubs.id))
    .leftJoin(memberProfiles, eq(bookings.memberId, memberProfiles.id))
    .where(
      and(
        gte(bookings.createdAt, dateRange.start),
        lte(bookings.createdAt, dateRange.end)
      )
    )
    .orderBy(desc(bookings.createdAt));

  return results;
};

/**
 * Export message logs for a given date range.
 */
export const exportMessageLogs = async (
  db: Database,
  dateRange: DateRange
) => {
  const results = await db
    .select({
      id: messageLogs.id,
      memberId: messageLogs.memberId,
      memberName: memberProfiles.name,
      direction: messageLogs.direction,
      channel: messageLogs.channel,
      bodyRedacted: messageLogs.bodyRedacted,
      createdAt: messageLogs.createdAt,
    })
    .from(messageLogs)
    .leftJoin(memberProfiles, eq(messageLogs.memberId, memberProfiles.id))
    .where(
      and(
        gte(messageLogs.createdAt, dateRange.start),
        lte(messageLogs.createdAt, dateRange.end)
      )
    )
    .orderBy(desc(messageLogs.createdAt));

  return results;
};
