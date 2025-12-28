import { routeAgentMessage, runStatusFollowup } from "@tee-time/agent";
import { clearBookingState, createMemberProfile } from "@tee-time/core";
import { getDb } from "@tee-time/database";
import type { EvalScenario } from "./types";

export const buildUpdateScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];

  const base = [
    {
      id: "update-confirmed",
      name: "Confirmed follow-up",
      run: async () => {
        const result = runStatusFollowup({ status: "Confirmed", memberName: "Alex", preferredDate: "2025-01-10", preferredTime: "14:00" });
        if (!result.message.toLowerCase().includes("confirmed")) return { status: "fail" as const, details: "Missing confirmed text" };
        return { status: "pass" as const };
      },
    },
    {
      id: "update-not-available",
      name: "Not available follow-up",
      run: async () => {
        const result = runStatusFollowup({ status: "Not Available", memberName: "Alex", preferredDate: "2025-01-10", preferredTime: "14:00", alternateTimes: ["15:00", "16:00"] });
        if (!result.message.toLowerCase().includes("couldn't secure")) return { status: "fail" as const, details: "Missing not available text" };
        return { status: "pass" as const };
      },
    },
    {
      id: "update-follow-up",
      name: "Follow-up required",
      run: async () => {
        const result = runStatusFollowup({ status: "Follow-up required", memberName: "Alex", preferredDate: "2025-01-10", preferredTime: "14:00" });
        if (!result.message.toLowerCase().includes("need a little more info")) return { status: "fail" as const, details: "Missing follow-up text" };
        return { status: "pass" as const };
      },
    },
    {
      id: "update-confirmed-e2e",
      name: "Confirmed follow-up (end-to-end)",
      run: async () => {
        const db = getDb();
        const member = await createMemberProfile(db, {
          phoneNumber: `+1555${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
          name: "Eval Confirmed",
          timezone: "America/Chicago",
          favoriteLocationLabel: "Eval",
          preferredLocationLabel: undefined,
          preferredTimeOfDay: undefined,
          preferredBayLabel: undefined,
          onboardingCompletedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await clearBookingState(db, member.id);
        const followup = runStatusFollowup({
          status: "Confirmed",
          memberName: "Alex",
          preferredDate: "2025-01-10",
          preferredTime: "14:00",
        });
        const conversationHistory = [
          { role: "assistant" as const, content: followup.message },
        ];
        const decision = await routeAgentMessage({
          message: "Actually change it to 3pm",
          memberId: member.id,
          memberExists: true,
          db,
          conversationHistory,
        });
        await clearBookingState(db, member.id);
        if (decision.flow !== "modify-booking") {
          return { status: "fail" as const, details: `Expected flow modify-booking, got ${decision.flow}` };
        }
        return { status: "pass" as const };
      },
    },
    {
      id: "update-not-available-e2e",
      name: "Not available follow-up (end-to-end)",
      run: async () => {
        const db = getDb();
        const member = await createMemberProfile(db, {
          phoneNumber: `+1555${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
          name: "Eval Not Available",
          timezone: "America/Chicago",
          favoriteLocationLabel: "Eval",
          preferredLocationLabel: undefined,
          preferredTimeOfDay: undefined,
          preferredBayLabel: undefined,
          onboardingCompletedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await clearBookingState(db, member.id);
        const followup = runStatusFollowup({
          status: "Not Available",
          memberName: "Alex",
          preferredDate: "2025-01-10",
          preferredTime: "14:00",
          alternateTimes: ["15:00", "16:00"],
        });
        const conversationHistory = [
          { role: "assistant" as const, content: followup.message },
        ];
        const decision = await routeAgentMessage({
          message: "15:00 works",
          memberId: member.id,
          memberExists: true,
          db,
          conversationHistory,
        });
        await clearBookingState(db, member.id);
        if (decision.flow !== "booking-new") {
          return { status: "fail" as const, details: `Expected flow booking-new, got ${decision.flow}` };
        }
        return { status: "pass" as const };
      },
    },
    {
      id: "update-follow-up-e2e",
      name: "Follow-up required (end-to-end)",
      run: async () => {
        const db = getDb();
        const member = await createMemberProfile(db, {
          phoneNumber: `+1555${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
          name: "Eval Followup",
          timezone: "America/Chicago",
          favoriteLocationLabel: "Eval",
          preferredLocationLabel: undefined,
          preferredTimeOfDay: undefined,
          preferredBayLabel: undefined,
          onboardingCompletedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await clearBookingState(db, member.id);
        const followup = runStatusFollowup({
          status: "Follow-up required",
          memberName: "Alex",
          preferredDate: "2025-01-10",
          preferredTime: "14:00",
        });
        const conversationHistory = [
          { role: "assistant" as const, content: followup.message },
        ];
        const decision = await routeAgentMessage({
          message: "Add guest Alex",
          memberId: member.id,
          memberExists: true,
          db,
          conversationHistory,
        });
        await clearBookingState(db, member.id);
        if (decision.flow !== "modify-booking") {
          return { status: "fail" as const, details: `Expected flow modify-booking, got ${decision.flow}` };
        }
        return { status: "pass" as const };
      },
    },
  ];

  return base.slice(0, count).map((t, i) => ({ id: `${t.id}-${i + 1}`, name: t.name, suite: "updates" as const, run: t.run }));
};
