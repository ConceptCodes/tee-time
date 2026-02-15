import { Hono } from "hono";
import { createHash } from "crypto";
import { z } from "zod";
import { validateRequest } from "twilio/lib/webhooks/webhooks";
import {
  getDb,
  createMemberRepository,
  createMessageLogRepository,
  createMessageDedupRepository,
  createNotificationRepository,
  createRateLimitCounterRepository,
  createWebhookDlqRepository,
} from "@tee-time/database";
import {
  clearBookingState,
  createSupportRequest,
  getFlowStateMeta,
  getBookingState,
  isFlowStateEnvelope,
  logAuditEvent,
  logMessage,
  createMemberProfile,
  redactSensitiveText,
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
      if (d.type === "submitted") return d.message;
      if (d.type === "submit")
        return "Processing your booking request...";
      return (d as { prompt?: string }).prompt ?? "How can I help you book?";
    }
    case "booking-status": {
      const d = decision.decision;
      if (d.type === "respond") return d.message;
      if (d.type === "not-found") return d.prompt;
      if (d.type === "need-booking-info") return d.prompt;
      if (d.type === "lookup")
        return `Checking booking ref: ${d.bookingReference}...`;
      return (d as { prompt?: string }).prompt ?? "Let me check that.";
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
      return (d as { prompt?: string }).prompt ?? "I can help with cancellations.";
    }
    case "modify-booking": {
      const d = decision.decision;
      if (d.type === "confirm-update") return d.prompt;
      if (d.type === "need-booking-info") return d.prompt;
      if (d.type === "lookup") return d.prompt ?? "Let me find that booking.";
      if (d.type === "update")
        return "Got it. I'll send that update request to staff.";
      return (d as { prompt?: string }).prompt ?? "How would you like to modify it?";
    }
    case "faq": {
      const d = decision.decision;
      if (d.type === "answer") return d.answer;
      if (d.type === "escalate")
        return "I'll connect you with our staff for more help.";
      return (d as { prompt?: string }).prompt ?? "I can check our FAQs for you.";
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

const DEFAULT_TIMEZONE = "Etc/UTC";
const DEFAULT_DEBOUNCE_WINDOW_SECONDS = 15;
const DEFAULT_DEDUP_WINDOW_SECONDS = 60;
const DEFAULT_HISTORY_WINDOW_TURNS = 10;
const DEFAULT_INACTIVITY_TIMEOUT_HOURS = 24;
const DEFAULT_MEMBER_RATE_LIMIT_MESSAGES_PER_HOUR = 30;
const DEFAULT_GLOBAL_RATE_LIMIT_REQUESTS_PER_MINUTE = 1000;

const FLOW_MAX_TURNS: Record<string, number> = {
  onboarding: 10,
  "booking-new": 15,
  faq: 3,
};

type RateLimitCounter = {
  exceeded: boolean;
  retryAfterSeconds: number;
  count: number;
};

const RESET_CONVERSATION_PATTERN = /\b(start over|restart|reset)\b/i;

const parseDebounceWindowSeconds = () => {
  const raw = process.env.DEBOUNCE_WINDOW_SECONDS;
  if (!raw) return DEFAULT_DEBOUNCE_WINDOW_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DEBOUNCE_WINDOW_SECONDS;
  if (parsed <= 0) return 0;
  return parsed;
};

const parseDedupWindowSeconds = () => {
  const raw = process.env.MESSAGE_DEDUP_WINDOW_SECONDS;
  if (!raw) return DEFAULT_DEDUP_WINDOW_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DEDUP_WINDOW_SECONDS;
  if (parsed <= 0) return 0;
  return parsed;
};

const parseInactivityTimeoutHours = () => {
  const raw = process.env.CONVERSATION_INACTIVITY_TIMEOUT_HOURS;
  if (!raw) return DEFAULT_INACTIVITY_TIMEOUT_HOURS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_INACTIVITY_TIMEOUT_HOURS;
  if (parsed <= 0) return DEFAULT_INACTIVITY_TIMEOUT_HOURS;
  return parsed;
};

const parseMemberRateLimitPerHour = () => {
  const raw = process.env.MEMBER_RATE_LIMIT_PER_HOUR;
  if (!raw) return DEFAULT_MEMBER_RATE_LIMIT_MESSAGES_PER_HOUR;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MEMBER_RATE_LIMIT_MESSAGES_PER_HOUR;
  if (parsed <= 0) return DEFAULT_MEMBER_RATE_LIMIT_MESSAGES_PER_HOUR;
  return parsed;
};

const parseGlobalRateLimitPerMinute = () => {
  const raw = process.env.WEBHOOK_GLOBAL_RATE_LIMIT_PER_MINUTE;
  if (!raw) return DEFAULT_GLOBAL_RATE_LIMIT_REQUESTS_PER_MINUTE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GLOBAL_RATE_LIMIT_REQUESTS_PER_MINUTE;
  if (parsed <= 0) return DEFAULT_GLOBAL_RATE_LIMIT_REQUESTS_PER_MINUTE;
  return parsed;
};

const parseHistoryWindowTurns = () => {
  const raw = process.env.CONVERSATION_HISTORY_WINDOW_TURNS;
  if (!raw) return DEFAULT_HISTORY_WINDOW_TURNS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_HISTORY_WINDOW_TURNS;
  if (parsed <= 0) return DEFAULT_HISTORY_WINDOW_TURNS;
  return parsed;
};

const consumePersistentToken = async (
  db: ReturnType<typeof getDb>,
  params: {
    scope: string;
    identifier: string;
    limit: number;
    windowSeconds: number;
    now?: Date;
  }
): Promise<RateLimitCounter> => {
  const now = params.now ?? new Date();
  const repo = createRateLimitCounterRepository(db);
  const row = await repo.consume({
    scope: params.scope,
    identifier: params.identifier,
    windowSeconds: params.windowSeconds,
    now,
  });
  if (!row) {
    return { exceeded: false, retryAfterSeconds: 0, count: 0 };
  }
  const windowEndMs =
    row.windowStart.getTime() + Number(row.windowSeconds) * 1000;
  return {
    exceeded: Number(row.count) > params.limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowEndMs - now.getTime()) / 1000)
    ),
    count: Number(row.count),
  };
};

const getFlowMaxTurns = (flow: string) => FLOW_MAX_TURNS[flow] ?? 15;

const buildEmptyTwimlResponse = () => `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

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
  let dlqPayload: Record<string, string> | null = null;

  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("Missing TWILIO_AUTH_TOKEN for webhook validation.");
      return c.text("Server misconfigured", 500);
    }

    const signature = c.req.header("x-twilio-signature") ?? "";

    // Parse the incoming webhook payload
    const formData = await c.req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });
    dlqPayload = payload;

    const isValid = validateRequest(authToken, signature, c.req.url, payload);
    if (!isValid) {
      console.error("Invalid Twilio signature.");
      return c.text("Invalid signature", 403);
    }

    const parsed = TwilioWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("Invalid webhook payload:", parsed.error);
      return c.text("Invalid request", 400);
    }

    const { From, Body, MessageSid, ProfileName } = parsed.data;
    const phoneNumber = extractPhoneNumber(From);
    const message = Body.trim();
    const now = new Date();
    const messageHash = createHash("sha256").update(message).digest("hex");
    const messageRedaction = redactSensitiveText(message);
    const profileNameRedaction = ProfileName
      ? redactSensitiveText(ProfileName, { startIndex: messageRedaction.nextIndex })
      : { redacted: null, redactions: [], nextIndex: messageRedaction.nextIndex };
    const phoneRedaction = redactSensitiveText(phoneNumber, {
      startIndex: profileNameRedaction.nextIndex,
    });
    const combinedRedactions = [
      ...messageRedaction.redactions,
      ...profileNameRedaction.redactions,
      ...phoneRedaction.redactions,
    ];

    // Log inbound message
    let memberId: string | undefined;
    let existingMember = await memberRepo.getByPhoneNumber(phoneNumber);
    if (!existingMember) {
      existingMember = await createMemberProfile(db, {
        phoneNumber,
        name: "Unknown",
        timezone: DEFAULT_TIMEZONE,
        favoriteLocationLabel: "Unknown",
        preferredLocationLabel: undefined,
        preferredTimeOfDay: undefined,
        preferredBayLabel: undefined,
        onboardingCompletedAt: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    memberId = existingMember?.id;
    const memberIsOnboarded = Boolean(existingMember?.onboardingCompletedAt);

    if (!memberId) {
      console.error("Missing member id for webhook message.");
      return c.text("Invalid member", 400);
    }

    const memberRateLimitPerHour = parseMemberRateLimitPerHour();
    const globalRateLimitPerMinute = parseGlobalRateLimitPerMinute();
    const globalRateLimit = await consumePersistentToken(db, {
      scope: "webhook.global",
      identifier: "all",
      limit: globalRateLimitPerMinute,
      windowSeconds: 60,
      now,
    });
    if (globalRateLimit.exceeded) {
      await logAuditEvent(db, {
        action: "webhook.rate_limit.global_exceeded",
        resourceType: "member_profile",
        resourceId: memberId,
        metadata: {
          retryAfterSeconds: globalRateLimit.retryAfterSeconds,
          configuredLimitPerMinute: globalRateLimitPerMinute,
        },
      });
      c.header("Content-Type", "application/xml");
      return c.body(
        formatTwimlResponse(
          "We're receiving high traffic right now. Please try again in a moment."
        )
      );
    }

    const memberRateLimit = await consumePersistentToken(db, {
      scope: "webhook.member",
      identifier: memberId,
      limit: memberRateLimitPerHour,
      windowSeconds: 60 * 60,
      now,
    });
    if (memberRateLimit.exceeded) {
      await logAuditEvent(db, {
        action: "webhook.rate_limit.member_exceeded",
        resourceType: "member_profile",
        resourceId: memberId,
        metadata: {
          retryAfterSeconds: memberRateLimit.retryAfterSeconds,
          configuredLimitPerHour: memberRateLimitPerHour,
        },
      });
      await logMessage(db, {
        memberId,
        direction: "inbound",
        channel: "whatsapp",
        providerMessageId: MessageSid,
        bodyRedacted: messageRedaction.redacted,
        bodyHash: messageHash,
        metadata: {
          profileName: profileNameRedaction.redacted,
          phoneNumber: phoneRedaction.redacted,
          redactions: combinedRedactions,
          rateLimited: true,
          retryAfterSeconds: memberRateLimit.retryAfterSeconds,
        },
      });
      c.header("Content-Type", "application/xml");
      return c.body(
        formatTwimlResponse(
          `You've reached the message limit. Please try again in about ${memberRateLimit.retryAfterSeconds} seconds.`
        )
      );
    }

    const dedupRepo = createMessageDedupRepository(db);
    const debounceSeconds = parseDebounceWindowSeconds();
    const dedupSeconds = parseDedupWindowSeconds();
    const historyWindowTurns = parseHistoryWindowTurns();
    const inactivityTimeoutHours = parseInactivityTimeoutHours();
    const dedupExpiresAt = new Date(now.getTime() + dedupSeconds * 1000);
    if (dedupSeconds > 0) {
      const existingDedup = await dedupRepo.getByMemberAndHash(
        memberId,
        messageHash
      );
      if (existingDedup) {
        if (existingDedup.expiresAt > now) {
          c.header("Content-Type", "application/xml");
          return c.body(buildEmptyTwimlResponse());
        }
        await dedupRepo.deleteByMemberAndHash(memberId, messageHash);
      }

      try {
        await dedupRepo.createWithExpiry({
          memberId,
          messageHash,
          receivedAt: now,
          expiresAt: dedupExpiresAt
        });
      } catch (error) {
        const err = error as { code?: string };
        if (err?.code === "23505") {
          c.header("Content-Type", "application/xml");
          return c.body(buildEmptyTwimlResponse());
        }
        throw error;
      }
    }

    const storedState = memberId
      ? await getBookingState<Record<string, unknown>>(db, memberId)
      : null;
    let storedEnvelope =
      storedState && isFlowStateEnvelope(storedState.state)
        ? storedState.state
        : null;

    const messageLogRepo = createMessageLogRepository(db);
    const historyLogs = await messageLogRepo.list({
      memberId,
      limit: Math.max(historyWindowTurns + 2, 12),
    });
    const lastMessageLog = historyLogs[0];
    if (
      lastMessageLog &&
      now.getTime() - lastMessageLog.createdAt.getTime() >
        inactivityTimeoutHours * 60 * 60 * 1000
    ) {
      await clearBookingState(db, memberId);
      storedEnvelope = null;
      await logAuditEvent(db, {
        action: "conversation.inactivity_reset",
        resourceType: "member_profile",
        resourceId: memberId,
        metadata: {
          inactivityTimeoutHours,
          lastMessageAt: lastMessageLog.createdAt.toISOString(),
        },
      });
    }
    if (debounceSeconds > 0) {
      const lastLog = lastMessageLog;
      if (
        lastLog &&
        lastLog.direction === "inbound" &&
        now.getTime() - lastLog.createdAt.getTime() < debounceSeconds * 1000
      ) {
        await logMessage(db, {
          memberId,
          direction: "inbound",
          channel: "whatsapp",
          providerMessageId: MessageSid,
          bodyRedacted: messageRedaction.redacted,
          bodyHash: messageHash,
          metadata: {
            profileName: profileNameRedaction.redacted,
            phoneNumber: phoneRedaction.redacted,
            redactions: combinedRedactions,
            debounced: true
          }
        });
        c.header("Content-Type", "application/xml");
        return c.body(buildEmptyTwimlResponse());
      }
    }

    await logMessage(db, {
      memberId,
      direction: "inbound",
      channel: "whatsapp",
      providerMessageId: MessageSid,
      bodyRedacted: messageRedaction.redacted,
      bodyHash: messageHash,
      metadata: {
        profileName: profileNameRedaction.redacted,
        phoneNumber: phoneRedaction.redacted,
        redactions: combinedRedactions,
      },
    });

    if (RESET_CONVERSATION_PATTERN.test(message)) {
      await clearBookingState(db, memberId);
      await logAuditEvent(db, {
        action: "conversation.manual_reset",
        resourceType: "member_profile",
        resourceId: memberId,
        metadata: {
          trigger: messageRedaction.redacted,
        },
      });
      const restartMessage =
        "Done. I reset our conversation. I can book a tee time, check booking status, cancel, modify, or answer FAQs.";
      const restartMessageHash = createHash("sha256")
        .update(restartMessage)
        .digest("hex");
      await logMessage(db, {
        memberId,
        direction: "outbound",
        channel: "whatsapp",
        bodyRedacted: restartMessage,
        bodyHash: restartMessageHash,
        metadata: {
          inReplyTo: MessageSid,
          agentFlow: "clarify",
          reset: true,
        },
      });
      c.header("Content-Type", "application/xml");
      return c.body(formatTwimlResponse(restartMessage));
    }

    const activeFlow = storedEnvelope?.flow;
    const activeFlowMeta = getFlowStateMeta(storedEnvelope);
    if (
      activeFlow &&
      activeFlowMeta &&
      activeFlowMeta.turnCount >= getFlowMaxTurns(activeFlow)
    ) {
      await clearBookingState(db, memberId);
      await logAuditEvent(db, {
        action: "conversation.turn_limit_exceeded",
        resourceType: "member_profile",
        resourceId: memberId,
        metadata: {
          flow: activeFlow,
          turnCount: activeFlowMeta.turnCount,
          configuredMaxTurns: getFlowMaxTurns(activeFlow),
        },
      });
      const limitMessage =
        "We've gone through a lot of messages on this request, so I reset this flow. Please send your booking request again and I'll continue from a clean state.";
      const limitMessageHash = createHash("sha256")
        .update(limitMessage)
        .digest("hex");
      await logMessage(db, {
        memberId,
        direction: "outbound",
        channel: "whatsapp",
        bodyRedacted: limitMessage,
        bodyHash: limitMessageHash,
        metadata: {
          inReplyTo: MessageSid,
          agentFlow: "clarify",
          flowReset: true,
          reason: "turn_limit",
        },
      });
      c.header("Content-Type", "application/xml");
      return c.body(formatTwimlResponse(limitMessage));
    }

    const recentLogs = historyLogs.slice(0, historyWindowTurns);
    if (
      recentLogs[0]?.direction === "inbound" &&
      recentLogs[0]?.bodyRedacted === messageRedaction.redacted
    ) {
      recentLogs.shift();
    }
    const conversationHistory = recentLogs
      .reverse()
      .map((entry) => ({
        role: (entry.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        content: entry.bodyRedacted,
      }));

    // Route the message through the agent
    const routerInput = {
      message,
      memberId,
      memberExists: memberIsOnboarded,
      db,
      conversationHistory,
    };

    const decision = await routeAgentMessage(routerInput);

    let finalDecision = decision;
    const stateTurnCounts = new Map<string, number>();
    const nextTurnCount = (flow: string) => {
      const cached = stateTurnCounts.get(flow);
      if (cached) return cached;
      const base = storedEnvelope?.flow === flow ? activeFlowMeta?.turnCount ?? 0 : 0;
      const next = base + 1;
      stateTurnCounts.set(flow, next);
      return next;
    };
    const saveFlowState = async (
      flow: string,
      state: Record<string, unknown>
    ) => {
      if (!memberId) return;
      await saveBookingState(
        db,
        memberId,
        wrapFlowState(flow, state, undefined, {
          turnCount: nextTurnCount(flow),
          lastUserMessageAt: now.toISOString(),
        })
      );
    };
    const clearFlowState = async () => {
      if (!memberId) return;
      await clearBookingState(db, memberId);
    };

    if (decision.flow === "onboarding") {
      const result = await runOnboardingFlow({
        message,
        phoneNumber,
        existingMemberId: memberId,
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
      } else if (
        result.type === "ask" ||
        result.type === "confirm-default" ||
        result.type === "confirm-skip"
      ) {
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
        } else if (d.allowSelection && d.selectionOptions?.length) {
          await saveFlowState("booking-status", {
            allowSelection: true,
            selectionOptions: d.selectionOptions,
          });
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
    const responseHash = createHash("sha256").update(responseMessage).digest("hex");
    const responseRedaction = redactSensitiveText(responseMessage);

    // Log outbound message
    await logMessage(db, {
      memberId,
      direction: "outbound",
      channel: "whatsapp",
      bodyRedacted: responseRedaction.redacted,
      bodyHash: responseHash,
      metadata: {
        inReplyTo: MessageSid,
        agentFlow: finalDecision.flow,
        redactions: responseRedaction.redactions,
      },
    });

    // Return TwiML response
    c.header("Content-Type", "application/xml");
    return c.body(formatTwimlResponse(responseMessage));
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    const now = new Date();
    const isReplay = c.req.header("x-dlq-replay") === "1";
    if (dlqPayload && !isReplay) {
      try {
        const webhookDlqRepo = createWebhookDlqRepository(db);
        await webhookDlqRepo.create({
          provider: "twilio",
          eventType: "whatsapp_inbound",
          payload: dlqPayload,
          status: "pending",
          attempts: 0,
          lastError: error instanceof Error ? error.message : String(error),
          nextRetryAt: new Date(now.getTime() + 60 * 1000),
          createdAt: now,
          updatedAt: now,
        });
      } catch (dlqError) {
        console.error("Failed to persist webhook DLQ event:", dlqError);
      }
    }
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
  let dlqPayload: Record<string, string> | null = null;

  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("Missing TWILIO_AUTH_TOKEN for status webhook validation.");
      return c.text("Server misconfigured", 500);
    }
    const signature = c.req.header("x-twilio-signature") ?? "";

    const formData = await c.req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });
    dlqPayload = payload;

    const isValid = validateRequest(authToken, signature, c.req.url, payload);
    if (!isValid) {
      console.error("Invalid Twilio signature.");
      return c.text("Invalid signature", 403);
    }

    const messageSid = payload.MessageSid;
    const messageStatus = payload.MessageStatus;
    const errorCode = payload.ErrorCode;
    const errorMessage = payload.ErrorMessage;

    if (messageSid && messageStatus) {
      const normalized = messageStatus.toLowerCase();
      const notificationRepo = createNotificationRepository(db);
      const terminalFailure =
        normalized === "failed" || normalized === "undelivered";
      const nextStatus = terminalFailure
        ? "failed"
        : normalized === "delivered" || normalized === "read"
          ? "delivered"
          : normalized === "sent"
            ? "sent"
            : "processing";

      await notificationRepo.updateByProviderMessageId(messageSid, {
        status: nextStatus,
        sentAt:
          nextStatus === "sent" || nextStatus === "delivered"
            ? new Date()
            : undefined,
        error:
          terminalFailure && (errorMessage || errorCode)
            ? `twilio:${errorCode ?? "unknown"}:${errorMessage ?? "delivery_failed"}`
            : null,
      });
      console.log(`Message ${messageSid} status: ${messageStatus}`);
    }

    return c.text("OK", 200);
  } catch (error) {
    console.error("Status callback error:", error);
    const now = new Date();
    const isReplay = c.req.header("x-dlq-replay") === "1";
    if (dlqPayload && !isReplay) {
      try {
        const webhookDlqRepo = createWebhookDlqRepository(db);
        await webhookDlqRepo.create({
          provider: "twilio",
          eventType: "whatsapp_status",
          payload: dlqPayload,
          status: "pending",
          attempts: 0,
          lastError: error instanceof Error ? error.message : String(error),
          nextRetryAt: new Date(now.getTime() + 60 * 1000),
          createdAt: now,
          updatedAt: now,
        });
      } catch (dlqError) {
        console.error("Failed to persist status callback DLQ event:", dlqError);
      }
    }
    return c.text("Error", 500);
  }
});
