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

/**
 * Send a WhatsApp message via Twilio API.
 */
export const sendWhatsAppMessage = async (params: {
  to: string;
  body: string;
  templateSid?: string;
  templateVariables?: Record<string, string>;
}) => {
  const { accountSid, authToken, whatsappNumber } = getTwilioConfig();
  const from = `whatsapp:${whatsappNumber}`;
  const to = params.to.startsWith("whatsapp:")
    ? params.to
    : `whatsapp:${params.to}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("From", from);
  formData.append("To", to);

  // If using a template, use ContentSid; otherwise use Body
  if (params.templateSid) {
    formData.append("ContentSid", params.templateSid);
    if (params.templateVariables) {
      formData.append(
        "ContentVariables",
        JSON.stringify(params.templateVariables)
      );
    }
  } else {
    formData.append("Body", params.body);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    logger.error("core.twilio.sendFailed", {
      to: params.to,
      error: result.message || result.code,
    });
    throw new Error(result.message || "twilio_send_failed");
  }

  logger.info("core.twilio.messageSent", {
    to: params.to,
    messageSid: result.sid,
  });

  return {
    messageSid: result.sid,
    status: result.status,
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
