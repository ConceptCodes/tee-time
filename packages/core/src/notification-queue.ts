import {
  createNotificationRepository,
  createScheduledJobRepository,
  createBookingRepository,
  createMemberRepository,
  createClubRepository,
  type Database,
  type Booking,
} from "@tee-time/database";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import { getErrorMessage } from "./errors";
import {
  sendWhatsAppMessage,
  getBookingNotificationMessage,
  type BookingNotificationTemplate,
  BookingNotificationTemplates,
} from "./notifications/twilio";

export type QueueNotificationParams = {
  bookingId: string;
  template: BookingNotificationTemplate;
  channel?: "whatsapp" | "slack" | "email";
  runAt?: Date;
  reason?: string;
  jobType?: "reminder" | "follow_up" | "retention";
};

/**
 * Queue a notification to be sent by the worker.
 * Uses the notifications table to track the notification and
 * scheduled_jobs to ensure async processing.
 */
export const queueBookingNotification = async (
  db: Database,
  params: QueueNotificationParams
) => {
  const now = new Date();
  const jobType = params.jobType ?? "reminder";
  const notification = await db.transaction(async (tx) => {
    const notificationRepo = createNotificationRepository(tx);
    const scheduledJobRepo = createScheduledJobRepository(tx);
    const created = await notificationRepo.create({
      bookingId: params.bookingId,
      channel: params.channel ?? "whatsapp",
      templateName: params.template,
      status: "pending",
      createdAt: now,
    });

    await scheduledJobRepo.create({
      jobType,
      bookingId: params.bookingId,
      runAt: params.runAt ?? now,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
    return created;
  });

  logger.info("core.notification.queued", {
    notificationId: notification.id,
    bookingId: params.bookingId,
    template: params.template,
    channel: params.channel ?? "whatsapp",
  });

  return notification;
};

export const resetStaleNotifications = async (
  db: Database,
  staleMinutes: number
): Promise<number> => {
  const staleThreshold = new Date(
    Date.now() - staleMinutes * 60 * 1000
  );

  const result = await db.execute(
    sql`
      update notifications
      set status = pending,
          error = null
      where status = processing
        and updated_at <= ${staleThreshold}
      returning *
    `
  );

  if (result.rows.length > 0) {
    logger.info("core.notification.staleReset", {
      count: result.rows.length,
      staleMinutes,
    });
  }

  return result.rows.length;
};

/**
 * Process a pending notification by sending it via the appropriate channel.
 */
export const processBookingNotification = async (
  db: Database,
  bookingId: string
) => {
  const bookingRepo = createBookingRepository(db);
  const memberRepo = createMemberRepository(db);
  const clubRepo = createClubRepository(db);
  const notificationRepo = createNotificationRepository(db);

  // Reset stale notifications before claiming to prevent deadlock
  const staleMinutes = Number(process.env.WORKER_STALE_NOTIFICATION_MINUTES ?? "15");
  await resetStaleNotifications(db, staleMinutes);

  // Atomically claim pending notifications to avoid duplicate sends across workers.
  const pending = await notificationRepo.claimPendingByBookingId(bookingId);

  if (pending.length === 0) {
    logger.info("core.notification.noPending", { bookingId });
    return;
  }

  // Get booking details
  const booking = await bookingRepo.getById(bookingId);
  if (!booking) {
    logger.warn("core.notification.bookingNotFound", { bookingId });
    return;
  }

  // Get member details
  const member = await memberRepo.getById(booking.memberId);
  if (!member) {
    logger.warn("core.notification.memberNotFound", {
      bookingId,
      memberId: booking.memberId,
    });
    return;
  }

  // Get club details
  const club = await clubRepo.getById(booking.clubId);

  for (const notification of pending) {
    try {
      if (notification.channel === "whatsapp") {
        const message = getBookingNotificationMessage(
          notification.templateName as BookingNotificationTemplate,
          {
            memberName: member.name,
            club: club?.name ?? "the club",
            date:
              typeof booking.preferredDate === "object" &&
              booking.preferredDate !== null &&
              "toISOString" in booking.preferredDate
                ? (booking.preferredDate as Date).toISOString().slice(0, 10)
                : String(booking.preferredDate),
            time: booking.preferredTimeStart,
            bookingId: booking.id,
          }
        );

        const result = await sendWhatsAppMessage({
          to: member.phoneNumber,
          body: message,
        });

        await notificationRepo.update(notification.id, {
          status: "sent",
          providerMessageId: result.messageSid,
          sentAt: new Date(),
        });

        logger.info("core.notification.sent", {
          notificationId: notification.id,
          bookingId,
          channel: "whatsapp",
          messageSid: result.messageSid,
        });
      } else {
        // Unsupported channels are terminal failures until implemented.
        await notificationRepo.update(notification.id, {
          status: "failed",
          error: `channel_not_implemented:${notification.channel}`,
        });
        logger.warn("core.notification.channelNotImplemented", {
          notificationId: notification.id,
          channel: notification.channel,
        });
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Notification failed");
      await notificationRepo.update(notification.id, {
        status: "failed",
        error: errorMessage,
      });

      logger.error("core.notification.failed", {
        notificationId: notification.id,
        bookingId,
        error: errorMessage,
      });
    }
  }
};

/**
 * Map booking status to notification template.
 */
export const getTemplateForStatus = (
  status: Booking["status"]
): BookingNotificationTemplate | null => {
  switch (status) {
    case "Confirmed":
      return BookingNotificationTemplates.BOOKING_CONFIRMED;
    case "Not Available":
      return BookingNotificationTemplates.BOOKING_NOT_AVAILABLE;
    case "Cancelled":
      return BookingNotificationTemplates.BOOKING_CANCELLED;
    case "Follow-up required":
      return BookingNotificationTemplates.BOOKING_INFO_REQUESTED;
    default:
      return null;
  }
};

/**
 * Schedule reminder notification.
 * Defaults to 24 hours before booking, configurable via NOTIFICATION_REMINDER_HOURS.
 */
export const scheduleBookingReminder = async (
  db: Database,
  booking: Booking
) => {
  const preferredDate =
    typeof booking.preferredDate === "object" &&
    booking.preferredDate !== null &&
    "toISOString" in booking.preferredDate
      ? (booking.preferredDate as Date)
      : new Date(String(booking.preferredDate));

  // Parse time and combine with date
  const [hours, minutes] = booking.preferredTimeStart.split(":").map(Number);
  const bookingDateTime = new Date(preferredDate);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  // Get configuration or default to 24 hours
  const reminderHours = Number(process.env.NOTIFICATION_REMINDER_HOURS ?? "24");
  
  // Schedule reminder before the booking
  const reminderTime = new Date(bookingDateTime.getTime() - reminderHours * 60 * 60 * 1000);

  // Only schedule if the reminder time is in the future
  if (reminderTime > new Date()) {
    await queueBookingNotification(db, {
      bookingId: booking.id,
      template: BookingNotificationTemplates.BOOKING_REMINDER,
      runAt: reminderTime,
    });

    logger.info("core.notification.reminderScheduled", {
      bookingId: booking.id,
      reminderAt: reminderTime.toISOString(),
      hoursBefore: reminderHours,
    });
  }
};

/**
 * Schedule follow-up notification.
 * Defaults to 24 hours after booking, configurable via NOTIFICATION_FOLLOW_UP_HOURS.
 */
export const scheduleBookingFollowUp = async (
  db: Database,
  booking: Booking
) => {
  const preferredDate =
    typeof booking.preferredDate === "object" &&
    booking.preferredDate !== null &&
    "toISOString" in booking.preferredDate
      ? (booking.preferredDate as Date)
      : new Date(String(booking.preferredDate));

  // Parse time and combine with date
  const [hours, minutes] = booking.preferredTimeStart.split(":").map(Number);
  const bookingDateTime = new Date(preferredDate);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  // Get configuration or default to 24 hours
  const followUpHours = Number(process.env.NOTIFICATION_FOLLOW_UP_HOURS ?? "24");

  // Schedule follow-up after the booking
  const followUpTime = new Date(bookingDateTime.getTime() + followUpHours * 60 * 60 * 1000);

  await queueBookingNotification(db, {
    bookingId: booking.id,
    template: BookingNotificationTemplates.BOOKING_FOLLOW_UP,
    jobType: "follow_up",
    runAt: followUpTime,
  });

  logger.info("core.notification.followUpScheduled", {
    bookingId: booking.id,
    followUpAt: followUpTime.toISOString(),
    hoursAfter: followUpHours,
  });
};
