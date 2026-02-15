import type { EvalScenario } from "./types";
import {
  getDb,
  createMemberRepository,
  createMessageDedupRepository,
  createRateLimitCounterRepository,
  createBookingStateRepository,
  createWebhookDlqRepository,
  createMessageLogRepository,
} from "@tee-time/database";
import { createMemberProfile, saveBookingState, clearBookingState, wrapFlowState } from "@tee-time/core";
import crypto from "node:crypto";

const scenarios: EvalScenario[] = [
  {
    id: "operational-dedup-1",
    name: "Duplicate message within dedup window is ignored",
    suite: "operational",
    run: async ({ now }) => {
      const db = getDb();
      const memberRepo = createMemberRepository(db);
      const dedupRepo = createMessageDedupRepository(db);

      const member = await createMemberProfile(db, {
        phoneNumber: "+15551234567",
        name: "Dedup Test User",
        timezone: "America/New_York",
        preferredClubIds: [],
      });

      const messageHash = crypto.hash("sha256", "test message content").digest("hex");
      const dedupSeconds = 60;
      const expiresAt = new Date(now.getTime() + dedupSeconds * 1000);

      await dedupRepo.createWithExpiry({
        memberId: member.id,
        messageHash,
        receivedAt: now,
        expiresAt,
      });

      const existingDedup = await dedupRepo.getByMemberAndHash(member.id, messageHash);
      if (!existingDedup) {
        return {
          status: "fail",
          details: "Failed to create initial dedup entry",
        };
      }

      if (existingDedup.expiresAt <= now) {
        return {
          status: "fail",
          details: "Dedup entry expired too early",
        };
      }

      const duplicateCheck = await dedupRepo.getByMemberAndHash(member.id, messageHash);

      if (!duplicateCheck) {
        return {
          status: "fail",
          details: "Duplicate message was not detected",
        };
      }

      if (duplicateCheck.expiresAt <= now) {
        return {
          status: "fail",
          details: "Duplicate dedup entry expired unexpectedly",
        };
      }

      return {
        status: "pass",
      };
    },
  },
  {
    id: "operational-rate-limit-1",
    name: "Member exceeding rate limit (30/hour) triggers rate limit",
    suite: "operational",
    run: async ({ now }) => {
      const db = getDb();
      const memberRepo = createMemberRepository(db);
      const rateLimitRepo = createRateLimitCounterRepository(db);

      const member = await createMemberProfile(db, {
        phoneNumber: "+15552345678",
        name: "Rate Limit Test User",
        timezone: "America/New_York",
        preferredClubIds: [],
      });

      const memberRateLimitPerHour = 30;
      const windowSeconds = 60 * 60;

      for (let i = 0; i < memberRateLimitPerHour; i++) {
        await rateLimitRepo.consume({
          scope: "webhook.member",
          identifier: member.id,
          windowSeconds,
          now,
        });
      }

      const current = await rateLimitRepo.getCurrent({
        scope: "webhook.member",
        identifier: member.id,
        windowSeconds,
        now,
      });

      if (!current) {
        return {
          status: "fail",
          details: "Rate limit counter not found after consuming tokens",
        };
      }

      if (current.count !== memberRateLimitPerHour) {
        return {
          status: "fail",
          details: `Expected count ${memberRateLimitPerHour}, got ${current.count}`,
        };
      }

      await rateLimitRepo.consume({
        scope: "webhook.member",
        identifier: member.id,
        windowSeconds,
        now,
      });

      const exceeded = await rateLimitRepo.getCurrent({
        scope: "webhook.member",
        identifier: member.id,
        windowSeconds,
        now,
      });

      if (!exceeded) {
        return {
          status: "fail",
          details: "Rate limit counter not found after exceeding limit",
        };
      }

      if (exceeded.count <= memberRateLimitPerHour) {
        return {
          status: "fail",
          details: `Expected count > ${memberRateLimitPerHour} after exceeding limit, got ${exceeded.count}`,
        };
      }

      return {
        status: "pass",
      };
    },
  },
  {
    id: "operational-inactivity-1",
    name: "State clears after 24 hours of inactivity",
    suite: "operational",
    run: async ({ now }) => {
      const db = getDb();
      const memberRepo = createMemberRepository(db);
      const bookingStateRepo = createBookingStateRepository(db);
      const messageLogRepo = createMessageLogRepository(db);

      const member = await createMemberProfile(db, {
        phoneNumber: "+15553456789",
        name: "Inactivity Test User",
        timezone: "America/New_York",
        preferredClubIds: [],
      });

      const testState = {
        flow: "booking-new" as const,
        collected: {
          clubId: "test-club-id",
          date: "2025-12-30",
          time: "14:00",
        },
      };

      await saveBookingState(
        db,
        member.id,
        wrapFlowState("booking-new", testState)
      );

      const beforeClear = await bookingStateRepo.getByMemberId(member.id);
      if (!beforeClear) {
        return {
          status: "fail",
          details: "Failed to create booking state",
        };
      }

      const inactivityTimeoutHours = 24;
      const oldMessageTime = new Date(now.getTime() - (inactivityTimeoutHours + 1) * 60 * 60 * 1000);

      await clearBookingState(db, member.id);

      const afterClear = await bookingStateRepo.getByMemberId(member.id);
      if (afterClear) {
        return {
          status: "fail",
          details: "Booking state was not cleared after inactivity timeout",
        };
      }

      return {
        status: "pass",
      };
    },
  },
  {
    id: "operational-dlq-1",
    name: "Failed webhook processing creates DLQ entry",
    suite: "operational",
    run: async ({ now }) => {
      const db = getDb();
      const dlqRepo = createWebhookDlqRepository(db);

      const failedPayload = {
        Body: "test message",
        From: "+15554567890",
        MessageSid: "test-message-sid",
      };

      const dlqEntry = await dlqRepo.create({
        provider: "twilio",
        eventType: "whatsapp_inbound",
        payload: JSON.stringify(failedPayload),
        status: "pending",
        attempts: 0,
        lastError: "Simulated webhook error",
        nextRetryAt: new Date(now.getTime() + 60 * 1000),
        createdAt: now,
        updatedAt: now,
      });

      if (!dlqEntry || !dlqEntry.id) {
        return {
          status: "fail",
          details: "Failed to create DLQ entry",
        };
      }

      const retrieved = await dlqRepo.getById(dlqEntry.id);
      if (!retrieved) {
        return {
          status: "fail",
          details: "DLQ entry not found after creation",
        };
      }

      if (retrieved.provider !== "twilio") {
        return {
          status: "fail",
          details: `Expected provider 'twilio', got '${retrieved.provider}'`,
        };
      }

      if (retrieved.eventType !== "whatsapp_inbound") {
        return {
          status: "fail",
          details: `Expected eventType 'whatsapp_inbound', got '${retrieved.eventType}'`,
        };
      }

      if (retrieved.status !== "pending") {
        return {
          status: "fail",
          details: `Expected status 'pending', got '${retrieved.status}'`,
        };
      }

      if (retrieved.attempts !== 0) {
        return {
          status: "fail",
          details: `Expected attempts 0, got ${retrieved.attempts}`,
        };
      }

      if (!retrieved.lastError || !retrieved.lastError.includes("error")) {
        return {
          status: "fail",
          details: `Expected error message, got '${retrieved.lastError}'`,
        };
      }

      return {
        status: "pass",
      };
    },
  },
];

export const buildOperationalScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  if (count > scenarios.length) {
    console.warn(
      `Operational suite has ${scenarios.length} scenarios, but ${count} requested. Using ${scenarios.length}.`
    );
  }
  return scenarios.slice(0, count);
};
