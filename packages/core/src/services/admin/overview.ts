import type { Database } from "@tee-time/database";
import {
  createBookingRepository,
  createNotificationRepository,
  createScheduledJobRepository
} from "@tee-time/database";
import { logger } from "../../logger";

const DEFAULT_LOOKBACK_DAYS = 30;

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
