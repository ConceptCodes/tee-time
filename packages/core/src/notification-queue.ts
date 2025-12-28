import {
  createNotificationRepository,
  createScheduledJobRepository,
  createBookingRepository,
  createMemberRepository,
  createClubRepository,
  type Database,
  type Booking,
} from "@tee-time/database";
import { logger } from "./logger";
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
  const notificationRepo = createNotificationRepository(db);
  const scheduledJobRepo = createScheduledJobRepository(db);
  const now = new Date();

  // Create the notification record
  const notification = await notificationRepo.create({
    bookingId: params.bookingId,
    channel: params.channel ?? "whatsapp",
    templateName: params.template,
    status: "pending",
    createdAt: now,
  });

  // Schedule a job to process the notification
  // We use "reminder" type for now since it can process booking-related tasks
  // The job metadata will indicate it's a notification job
  await scheduledJobRepo.create({
    jobType: "reminder", // Reusing existing job type
    bookingId: params.bookingId,
    runAt: params.runAt ?? now,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("core.notification.queued", {
    notificationId: notification.id,
    bookingId: params.bookingId,
    template: params.template,
    channel: params.channel ?? "whatsapp",
  });

  return notification;
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

  // Get the pending notifications for this booking
  const notifications = await notificationRepo.listByBookingId(bookingId);
  const pending = notifications.filter((n) => n.status === "pending");

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
        // For other channels (slack, email), mark as pending implementation
        logger.warn("core.notification.channelNotImplemented", {
          notificationId: notification.id,
          channel: notification.channel,
        });
      }
    } catch (error) {
      await notificationRepo.update(notification.id, {
        status: "failed",
        error: (error as Error).message,
      });

      logger.error("core.notification.failed", {
        notificationId: notification.id,
        bookingId,
        error: (error as Error).message,
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
    runAt: followUpTime,
  });

  logger.info("core.notification.followUpScheduled", {
    bookingId: booking.id,
    followUpAt: followUpTime.toISOString(),
    hoursAfter: followUpHours,
  });
};
