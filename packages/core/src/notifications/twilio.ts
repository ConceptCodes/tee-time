import { Twilio } from "twilio";
import type { MessageListInstanceCreateOptions } from "twilio/lib/rest/api/v2010/account/message";
import { logger } from "../logger";

/**
 * Twilio WhatsApp client configuration.
 */
const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
  }

  return { accountSid, authToken, whatsappNumber };
};

let cachedClient: Twilio | null = null;

const getTwilioClient = () => {
  if (cachedClient) {
    return cachedClient;
  }
  const { accountSid, authToken } = getTwilioConfig();
  cachedClient = new Twilio(accountSid, authToken);
  return cachedClient;
};

/**
 * Send a WhatsApp message via Twilio API.
 */
export const sendWhatsAppMessage = async (params: {
  to: string;
  body: string;
  templateSid?: string;
  templateVariables?: Record<string, string>;
}) => {
  const { whatsappNumber } = getTwilioConfig();
  const client = getTwilioClient();
  const from = `whatsapp:${whatsappNumber}`;
  const to = params.to.startsWith("whatsapp:")
    ? params.to
    : `whatsapp:${params.to}`;

  const messagePayload: MessageListInstanceCreateOptions = {
    from,
    to,
  };
  if (params.templateSid) {
    messagePayload.contentSid = params.templateSid;
    if (params.templateVariables) {
      messagePayload.contentVariables = JSON.stringify(
        params.templateVariables
      );
    }
  } else {
    messagePayload.body = params.body;
  }

  let result: { sid?: string; status?: string | null };
  try {
    result = await client.messages.create(messagePayload);
  } catch (error) {
    const message =
      (error as Error)?.message ?? "twilio_send_failed";
    logger.error("core.twilio.sendFailed", {
      to: params.to,
      error: message,
    });
    throw new Error(message);
  }

  logger.info("core.twilio.messageSent", {
    to: params.to,
    messageSid: result.sid,
  });

  return {
    messageSid: result.sid ?? "",
    status: result.status ?? "queued",
  };
};

/**
 * Booking notification templates.
 * These should match your Twilio-approved WhatsApp templates.
 */
export const BookingNotificationTemplates = {
  BOOKING_RECEIVED: "booking_received",
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_NOT_AVAILABLE: "booking_not_available",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_REMINDER: "booking_reminder",
  BOOKING_FOLLOW_UP: "booking_follow_up",
  BOOKING_INFO_REQUESTED: "booking_info_requested",
} as const;

export type BookingNotificationTemplate =
  (typeof BookingNotificationTemplates)[keyof typeof BookingNotificationTemplates];

/**
 * Get the message body for a booking notification.
 */
export const getBookingNotificationMessage = (
  template: BookingNotificationTemplate,
  variables: {
    memberName?: string;
    club?: string;
    date?: string;
    time?: string;
    bookingId?: string;
    reason?: string;
  }
): string => {
  const { memberName = "there", club = "", date = "", time = "" } = variables;

  switch (template) {
    case BookingNotificationTemplates.BOOKING_RECEIVED:
      return `Hi ${memberName}! We've received your booking request for ${club} on ${date} at ${time}. Our team will confirm it shortly.`;

    case BookingNotificationTemplates.BOOKING_CONFIRMED:
      return `Great news, ${memberName}! Your tee time at ${club} on ${date} at ${time} is confirmed. See you on the course!`;

    case BookingNotificationTemplates.BOOKING_NOT_AVAILABLE:
      return `Hi ${memberName}, unfortunately ${club} on ${date} at ${time} isn't available. ${variables.reason || "Would you like to try a different time?"}`;

    case BookingNotificationTemplates.BOOKING_CANCELLED:
      return `Hi ${memberName}, your booking at ${club} on ${date} at ${time} has been cancelled. ${variables.reason || "Let us know if you'd like to rebook."}`;

    case BookingNotificationTemplates.BOOKING_REMINDER:
      return `Reminder: You have a tee time at ${club} tomorrow at ${time}. Cancel by replying "cancel" if needed.`;

    case BookingNotificationTemplates.BOOKING_FOLLOW_UP:
      return `Hi ${memberName}! How was your game at ${club} on ${date}? We'd love to hear about your experience!`;

    case BookingNotificationTemplates.BOOKING_INFO_REQUESTED:
      return `Hi ${memberName}, we need a bit more info about your booking request for ${club} on ${date}. ${variables.reason || "Please reply with the details or call us."}`;

    default:
      return `Update on your booking at ${club}: ${variables.reason || "Please check with us for details."}`;
  }
};
