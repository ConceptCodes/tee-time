import type { Database } from "@tee-time/database";
import {
  bookings,
  clubLocations,
  clubs,
  createBookingRepository,
  createNotificationRepository,
  createScheduledJobRepository,
  memberProfiles
} from "@tee-time/database";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { logger } from "../../logger";
import { getAverageStaffResponseTime, getConversionRate, getAutomationTrend } from "./reports";

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_UPCOMING_LIMIT = 3;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dateRangeForDays = (end: Date, days: number) => {
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
};

const percentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const getAdminOverviewStats = async (
  db: Database,
  params?: { lookbackDays?: number }
) => {
  const lookbackDays = params?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const bookingsRepo = createBookingRepository(db);
  const notificationsRepo = createNotificationRepository(db);
  const scheduledJobsRepo = createScheduledJobRepository(db);

  const [statusCounts, total, resolved, notificationErrors, jobErrors] =
    await Promise.all([
      bookingsRepo.countByStatus({ since }),
      bookingsRepo.countTotal({ since }),
      bookingsRepo.countByStatusSet(
        ["Confirmed", "Not Available", "Cancelled", "Follow-up required"],
        { since }
      ),
      notificationsRepo.countErrors(),
      scheduledJobsRepo.countErrors()
    ]);

  const automationRate =
    total > 0 ? Number((resolved / total).toFixed(4)) : 0;

  logger.info("core.admin.overview.stats", {
    lookbackDays,
    totalBookings: total,
    automationRate
  });
  return {
    lookbackDays,
    bookings: {
      total,
      byStatus: statusCounts
    },
    errors: {
      total: notificationErrors + jobErrors,
      notifications: notificationErrors,
      scheduledJobs: jobErrors
    },
    automationRate
  };
};

export const listRecentActivity = async (
  db: Database,
  params?: { limit?: number }
) => {
  const limit = params?.limit ?? 10;
  const bookingsRepo = createBookingRepository(db);
  const notificationsRepo = createNotificationRepository(db);
  const scheduledJobsRepo = createScheduledJobRepository(db);

  const [recentBookings, notificationErrors, jobErrors] = await Promise.all([
    bookingsRepo.listRecent(limit),
    notificationsRepo.listRecentErrors(limit),
    scheduledJobsRepo.listRecentErrors(limit)
  ]);

  logger.info("core.admin.overview.recentActivity", {
    limit,
    bookings: recentBookings.length,
    notificationErrors: notificationErrors.length,
    jobErrors: jobErrors.length
  });
  return {
    recentBookings,
    recentErrors: {
      notifications: notificationErrors,
      scheduledJobs: jobErrors
    }
  };
};

export const getOverviewUiData = async (
  db: Database,
  params?: { lookbackDays?: number; upcomingLimit?: number; pendingLimit?: number }
) => {
  const lookbackDays = params?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const upcomingLimit = params?.upcomingLimit ?? DEFAULT_UPCOMING_LIMIT;
  const pendingLimit = params?.pendingLimit ?? DEFAULT_UPCOMING_LIMIT;
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  const todayRange = {
    start: todayStart,
    end: new Date(tomorrowStart.getTime() - 1)
  };
  const yesterdayRange = {
    start: yesterdayStart,
    end: new Date(todayStart.getTime() - 1)
  };

  const [bookingsToday, bookingsYesterday, pendingToday, pendingYesterday] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(
          and(
            gte(bookings.createdAt, todayRange.start),
            lte(bookings.createdAt, todayRange.end)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(
          and(
            gte(bookings.createdAt, yesterdayRange.start),
            lte(bookings.createdAt, yesterdayRange.end)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(
          and(
            gte(bookings.createdAt, todayRange.start),
            lte(bookings.createdAt, todayRange.end),
            eq(bookings.status, "Pending")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(
          and(
            gte(bookings.createdAt, yesterdayRange.start),
            lte(bookings.createdAt, yesterdayRange.end),
            eq(bookings.status, "Pending")
          )
        )
    ]);

  const todayCount = Number(bookingsToday[0]?.count ?? 0);
  const yesterdayCount = Number(bookingsYesterday[0]?.count ?? 0);
  const pendingTodayCount = Number(pendingToday[0]?.count ?? 0);
  const pendingYesterdayCount = Number(pendingYesterday[0]?.count ?? 0);

  const currentRange = dateRangeForDays(now, lookbackDays);
  const previousRange = dateRangeForDays(
    currentRange.start,
    lookbackDays
  );

  const [responseCurrent, responsePrevious, conversionCurrent, conversionPrevious, automationCurrent, automationPrevious] =
    await Promise.all([
      getAverageStaffResponseTime(db, currentRange),
      getAverageStaffResponseTime(db, previousRange),
      getConversionRate(db, currentRange),
      getConversionRate(db, previousRange),
      getAutomationTrend(db, currentRange),
      getAutomationTrend(db, previousRange)
    ]);

  const [newMembersCurrent, newMembersPrevious, activeMembersCurrent, activeMembersPrevious, upcoming, pendingConfirmations] =
    await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(memberProfiles)
      .where(
        and(
          gte(memberProfiles.createdAt, currentRange.start),
          lte(memberProfiles.createdAt, currentRange.end)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(memberProfiles)
      .where(
        and(
          gte(memberProfiles.createdAt, previousRange.start),
          lte(memberProfiles.createdAt, previousRange.end)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(memberProfiles)
      .where(eq(memberProfiles.isActive, true)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(memberProfiles)
      .where(
        and(
          eq(memberProfiles.isActive, true),
          lte(memberProfiles.createdAt, previousRange.end)
        )
      ),
    db
      .select({
        id: bookings.id,
        preferredDate: bookings.preferredDate,
        preferredTimeStart: bookings.preferredTimeStart,
        preferredTimeEnd: bookings.preferredTimeEnd,
        status: bookings.status,
        numberOfPlayers: bookings.numberOfPlayers,
        memberName: memberProfiles.name,
        clubName: clubs.name,
        locationName: clubLocations.name
      })
      .from(bookings)
      .leftJoin(memberProfiles, eq(bookings.memberId, memberProfiles.id))
      .leftJoin(clubs, eq(bookings.clubId, clubs.id))
      .leftJoin(clubLocations, eq(bookings.clubLocationId, clubLocations.id))
      .where(
        and(
          gte(bookings.preferredDate, todayStart),
          inArray(bookings.status, ["Pending", "Confirmed", "Follow-up required"])
        )
      )
      .orderBy(asc(bookings.preferredDate), asc(bookings.preferredTimeStart))
      .limit(upcomingLimit),
    db
      .select({
        id: bookings.id,
        preferredDate: bookings.preferredDate,
        preferredTimeStart: bookings.preferredTimeStart,
        preferredTimeEnd: bookings.preferredTimeEnd,
        status: bookings.status,
        numberOfPlayers: bookings.numberOfPlayers,
        memberName: memberProfiles.name,
        clubName: clubs.name,
        locationName: clubLocations.name
      })
      .from(bookings)
      .leftJoin(memberProfiles, eq(bookings.memberId, memberProfiles.id))
      .leftJoin(clubs, eq(bookings.clubId, clubs.id))
      .leftJoin(clubLocations, eq(bookings.clubLocationId, clubLocations.id))
      .where(eq(bookings.status, "Pending"))
      .orderBy(asc(bookings.preferredDate), asc(bookings.preferredTimeStart))
      .limit(pendingLimit)
  ]);

  const currentMembersCount = Number(newMembersCurrent[0]?.count ?? 0);
  const previousMembersCount = Number(newMembersPrevious[0]?.count ?? 0);
  const activeCount = Number(activeMembersCurrent[0]?.count ?? 0);
  const previousActiveCount = Number(activeMembersPrevious[0]?.count ?? 0);
  const responseChange = percentChange(
    responseCurrent.averageMinutes,
    responsePrevious.averageMinutes
);
  const vipResponseRate = conversionCurrent.conversionRate;
  const vipResponseChange = percentChange(
    conversionCurrent.conversionRate,
    conversionPrevious.conversionRate
  );

  const calculateAutomationRate = (trend: { automated: number; handoff: number }[]) => {
    const totalAutomated = trend.reduce((sum, item) => sum + item.automated, 0);
    const totalHandoff = trend.reduce((sum, item) => sum + item.handoff, 0);
    const total = totalAutomated + totalHandoff;
    return total > 0 ? (totalAutomated / total) * 100 : 0;
  };

  const automationRateCurrent = calculateAutomationRate(automationCurrent);
  const automationRatePrevious = calculateAutomationRate(automationPrevious);

  logger.info("core.admin.overview.ui", {
    lookbackDays,
    upcomingLimit,
    bookingsToday: todayCount,
    pendingToday: pendingTodayCount,
    responseMinutes: responseCurrent.averageMinutes,
    activeMembers: activeCount,
    automationRate: automationRateCurrent
  });

  return {
    lookbackDays,
    stats: {
      bookingsToday: {
        value: todayCount,
        changePct: percentChange(todayCount, yesterdayCount)
      },
      pendingApprovals: {
        value: pendingTodayCount,
        changePct: percentChange(pendingTodayCount, pendingYesterdayCount)
      },
      avgResponseTimeMinutes: {
        value: responseCurrent.averageMinutes,
        changePct: responseChange
      },
      activeMembers: {
        value: activeCount,
        changePct: percentChange(activeCount, previousActiveCount)
      },
      automationRate: {
        value: Number(automationRateCurrent.toFixed(1)),
        changePct: percentChange(automationRateCurrent, automationRatePrevious)
      }
    },
    upcoming,
    pendingConfirmations,
    memberPulse: {
      vipResponseRate,
      vipResponseChangePct: vipResponseChange,
      newMemberInvites: currentMembersCount,
      inviteChangePct: percentChange(currentMembersCount, previousMembersCount)
    }
  };
};
