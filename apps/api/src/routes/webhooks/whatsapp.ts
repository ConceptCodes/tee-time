import { Hono } from "hono";
import { z } from "zod";
import {
  getDb,
  createMemberRepository,
  createMessageLogRepository,
} from "@tee-time/database";
import {
  clearBookingState,
  createSupportRequest,
  getBookingState,
  isFlowStateEnvelope,
  logMessage,
  saveBookingState,
  wrapFlowState,
} from "@tee-time/core";
import {
  routeAgentMessage,
  runOnboardingFlow,
  runSupportHandoffFlow,
  type RouterDecision,
} from "@tee-time/agent";

/**
 * Twilio WhatsApp webhook request schema.
 */
const TwilioWebhookSchema = z.object({
  From: z.string(), // WhatsApp number in format whatsapp:+1234567890
  To: z.string(),
  Body: z.string(),
  MessageSid: z.string(),
  ProfileName: z.string().optional(),
  NumMedia: z.string().optional(),
  MediaUrl0: z.string().optional(),
  MediaContentType0: z.string().optional(),
});

export type TwilioWebhookPayload = z.infer<typeof TwilioWebhookSchema>;

/**
 * Extract phone number from Twilio WhatsApp format.
 */
const extractPhoneNumber = (twilioNumber: string): string => {
  return twilioNumber.replace("whatsapp:", "");
};

/**
 * Format response as TwiML for Twilio.
 */
const formatTwimlResponse = (message: string): string => {
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapedMessage}</Message>
</Response>`;
};

/**
 * Process the agent decision and convert to response message.
 */
// NOTE: this needs to be refactored, wtf codex
const processDecision = (decision: RouterDecision): string => {
  switch (decision.flow) {
    case "booking-new": {
      const d = decision.decision;
      if (d.type === "ask" || d.type === "ask-alternatives") return d.prompt;
      if (d.type === "confirm-default") return d.prompt;
      if (d.type === "review") return d.summary;
      if (d.type === "submitted")
        return `Your booking has been submitted! Reference: ${d.bookingId}. ${d.message}`;
      if (d.type === "submit")
        return "Processing your booking request...";
      return d.prompt;
    }
    case "booking-status": {
      const d = decision.decision;
      if (d.type === "respond") return d.message;
      if (d.type === "not-found") return d.prompt;
      if (d.type === "need-booking-info") return d.prompt;
      if (d.type === "lookup")
        return `Checking booking ref: ${d.bookingReference}...`;
      return d.prompt;
    }
    case "cancel-booking": {
      const d = decision.decision;
      if (d.type === "cancelled") return d.message;
      if (d.type === "confirm-cancel") return d.prompt;
      if (d.type === "offer-booking") return d.prompt;
      if (d.type === "need-booking-info") return d.prompt;
      if (d.type === "lookup") return d.prompt ?? "Let me find that booking.";
      if (d.type === "not-allowed") return d.prompt;
      if (d.type === "not-found") return d.prompt;
      return d.prompt;
    }
    case "modify-booking": {
      const d = decision.decision;
      if (d.type === "confirm-update") return d.prompt;
      if (d.type === "need-booking-info") return d.prompt;
      if (d.type === "lookup") return d.prompt ?? "Let me find that booking.";
      if (d.type === "update")
        return "Got it. I'll send that update request to staff.";
      return d.prompt;
    }
    case "faq": {
      const d = decision.decision;
      if (d.type === "answer") return d.answer;
      if (d.type === "escalate")
        return "I'll connect you with our staff for more help.";
      return d.prompt;
    }
    case "onboarding":
      return "Welcome to Tee Time! Let's get you set up. What name should we use for your member profile?";
    case "support":
      return "I'll connect you with our staff. Someone will be with you shortly.";
    case "clarify":
      return decision.prompt;
    default:
      return "I'm here to help with tee time bookings, FAQs, or connecting you with staff. What can I help with?";
  }
};

export const whatsappWebhookRoutes = new Hono();

/**
 * Twilio webhook verification endpoint.
 * Used for initial webhook setup validation.
 */
whatsappWebhookRoutes.get("/", (c) => {
  return c.text("WhatsApp webhook is active", 200);
});

/**
 * Main WhatsApp message webhook handler.
 * Receives incoming messages from Twilio and routes them through the agent.
 */
whatsappWebhookRoutes.post("/", async (c) => {
  const db = getDb();
  const memberRepo = createMemberRepository(db);

  try {
    // Parse the incoming webhook payload
    const formData = await c.req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const parsed = TwilioWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("Invalid webhook payload:", parsed.error);
      return c.text("Invalid request", 400);
    }

    const { From, Body, MessageSid, ProfileName } = parsed.data;
    const phoneNumber = extractPhoneNumber(From);
    const message = Body.trim();

    // Log inbound message
    let memberId: string | undefined;
    const existingMember = await memberRepo.getByPhoneNumber(phoneNumber);
    memberId = existingMember?.id;

    const storedState = memberId
      ? await getBookingState<Record<string, unknown>>(db, memberId)
      : null;
    const storedEnvelope =
      storedState && isFlowStateEnvelope(storedState.state)
        ? storedState.state
        : null;

    await logMessage(db, {
      memberId: memberId ?? phoneNumber, // Use phone number if no member ID
      direction: "inbound",
      channel: "whatsapp",
      providerMessageId: MessageSid,
      bodyRedacted: message,
      metadata: {
        profileName: ProfileName,
        phoneNumber,
      },
    });

    const messageLogRepo = createMessageLogRepository(db);
    const historyLogs = await messageLogRepo.listByMemberId(
      memberId ?? phoneNumber
    );
    const recentLogs = historyLogs.slice(0, 6);
    if (
      recentLogs[0]?.direction === "inbound" &&
      recentLogs[0]?.bodyRedacted === message
    ) {
      recentLogs.shift();
    }
    const conversationHistory = recentLogs
      .reverse()
      .map((entry) => ({
        role: entry.direction === "inbound" ? "user" : "assistant",
        content: entry.bodyRedacted,
      }));

    // Route the message through the agent
    const routerInput = {
      message,
      memberId,
      memberExists: !!existingMember,
      db,
      conversationHistory,
    };

    const decision = await routeAgentMessage(routerInput);

    let finalDecision = decision;
    const saveFlowState = async (
      flow: string,
      state: Record<string, unknown>
    ) => {
      if (!memberId) return;
      await saveBookingState(db, memberId, wrapFlowState(flow, state));
    };
    const clearFlowState = async () => {
      if (!memberId) return;
      await clearBookingState(db, memberId);
    };

    if (decision.flow === "onboarding") {
      const result = await runOnboardingFlow({
        message,
        phoneNumber,
        db,
        existingState:
          storedEnvelope?.flow === "onboarding"
            ? (storedEnvelope.data as Parameters<typeof runOnboardingFlow>[0]["existingState"])
            : undefined,
        conversationHistory,
      });
      // Handle onboarding response
      if (result.type === "submitted") {
        memberId = result.memberId;
        await clearFlowState();
        finalDecision = {
          flow: "clarify",
          prompt: `Welcome, ${result.payload.name}! You're all set up. How can I help you book a tee time?`,
        };
      } else if (result.type === "ask" || result.type === "confirm-default") {
        await saveFlowState("onboarding", result.nextState);
        finalDecision = { flow: "clarify", prompt: result.prompt };
      } else if (result.type === "clarify") {
        finalDecision = { flow: "clarify", prompt: result.prompt };
      }
    } else if (decision.flow === "support") {
      const result = await runSupportHandoffFlow({
        message,
        memberId,
        existingState:
          storedEnvelope?.flow === "support"
            ? (storedEnvelope.data as Parameters<typeof runSupportHandoffFlow>[0]["existingState"])
            : undefined,
      });
      // Create support request and notify staff
      if (result.type === "handoff") {
        if (memberId) {
          const summary =
            result.payload.summary ??
            result.payload.reason ??
            "Support request";
          await createSupportRequest(db, {
            memberId,
            message: summary,
          });
        }
        await clearFlowState();
        finalDecision = {
          flow: "clarify",
          prompt: "I've notified our staff about your request. Someone will reach out to you shortly.",
        };
      } else {
        if (result.type === "confirm-handoff") {
          await saveFlowState("support", result.nextState);
        }
        finalDecision = { flow: "clarify", prompt: result.prompt };
      }
    } else if (decision.flow === "cancel-booking") {
      const d = decision.decision;
      if (d.type === "cancelled") {
        await clearFlowState();
      } else if (d.type === "offer-booking") {
        await saveFlowState("cancel-booking", { offerBooking: true });
      } else if (
        d.type === "lookup" ||
        d.type === "need-booking-info" ||
        d.type === "confirm-cancel"
      ) {
        await saveFlowState("cancel-booking", d.nextState);
      }
    } else if (decision.flow === "booking-status") {
      const d = decision.decision;
      if (d.type === "respond") {
        if (d.offerBooking) {
          await saveFlowState("booking-status", { offerBooking: true });
        } else {
          await clearFlowState();
        }
      } else if (
        d.type === "lookup" ||
        d.type === "need-booking-info" ||
        d.type === "not-found" ||
        d.type === "clarify"
      ) {
        await saveFlowState("booking-status", { pending: true });
      }
    } else if (decision.flow === "modify-booking") {
      const d = decision.decision;
      if (d.type === "update") {
        if (memberId) {
          const payload = d.payload;
          const summaryParts = [
            payload.bookingId ? `Booking ID: ${payload.bookingId}` : null,
            payload.bookingReference
              ? `Reference: ${payload.bookingReference}`
              : null,
            payload.club ? `Club: ${payload.club}` : null,
            payload.clubLocation ? `Location: ${payload.clubLocation}` : null,
            payload.preferredDate ? `Date: ${payload.preferredDate}` : null,
            payload.preferredTime ? `Time: ${payload.preferredTime}` : null,
            payload.players ? `Players: ${payload.players}` : null,
            payload.guestNames ? `Guests: ${payload.guestNames}` : null,
            payload.notes ? `Notes: ${payload.notes}` : null,
          ].filter(Boolean);
          await createSupportRequest(db, {
            memberId,
            message:
              summaryParts.length > 0
                ? `Modify booking request:\n${summaryParts.join("\n")}`
                : "Modify booking request",
          });
        }
        await clearFlowState();
      } else if (
        d.type === "lookup" ||
        d.type === "need-booking-info" ||
        d.type === "confirm-update"
      ) {
        await saveFlowState("modify-booking", d.nextState);
      }
    }

    // Generate response message
    const responseMessage = processDecision(finalDecision);

    // Log outbound message
    await logMessage(db, {
      memberId: memberId ?? phoneNumber,
      direction: "outbound",
      channel: "whatsapp",
      bodyRedacted: responseMessage,
      metadata: {
        inReplyTo: MessageSid,
        agentFlow: finalDecision.flow,
        phoneNumber,
      },
    });

    // Return TwiML response
    c.header("Content-Type", "application/xml");
    return c.body(formatTwimlResponse(responseMessage));
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    c.header("Content-Type", "application/xml");
    return c.body(
      formatTwimlResponse(
        "Sorry, something went wrong. Please try again or contact us directly."
      )
    );
  }
});

/**
 * Twilio delivery status callback endpoint.
 */
whatsappWebhookRoutes.post("/status", async (c) => {
  const db = getDb();
  const messageLogRepo = createMessageLogRepository(db);

  try {
    const formData = await c.req.formData();
    const messageSid = formData.get("MessageSid")?.toString();
    const messageStatus = formData.get("MessageStatus")?.toString();

    if (messageSid && messageStatus) {
      // Log status update - we'll find by provider message ID
      console.log(`Message ${messageSid} status: ${messageStatus}`);
      // Note: updateBySid method would need to be added to the repository
      // For now, just log the status update
    }

    return c.text("OK", 200);
  } catch (error) {
    console.error("Status callback error:", error);
    return c.text("Error", 500);
  }
});
