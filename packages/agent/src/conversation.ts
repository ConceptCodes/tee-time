import { type Database } from "@tee-time/database";
import { createMemberRepository } from "@tee-time/database";
import { routeAgentMessage } from "./workflows/router";
import { runOnboardingFlow } from "./workflows/onboarding";
import { runSupportHandoffFlow } from "./workflows/support-handoff";
import { isCourseCorrection } from "./utils";
import {
  clearBookingState,
  createSupportRequest,
  extractSharedContext,
  getBookingState,
  isFlowStateEnvelope,
  mergeSharedContext,
  saveBookingState,
  wrapFlowState,
} from "@tee-time/core";

export type AgentConversationInput = {
  message: string;
  memberId: string;
  db: Database;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type AgentConversationResult = {
  responseText: string;
  flow: string;
};

/**
 * Main entrypoint for running a conversational agent interaction.
 * Handles routing, workflow execution, and state management.
 */
export async function runAgentConversation(
  input: AgentConversationInput
): Promise<AgentConversationResult> {
  const { message, memberId, db, conversationHistory = [] } = input;

  const memberRepo = createMemberRepository(db);
  const member = await memberRepo.getById(memberId);

  if (!member) {
    throw new Error(`Member not found: ${memberId}`);
  }

  // Get stored booking state
  const storedState = await getBookingState<Record<string, unknown>>(
    db,
    member.id
  );
  const storedEnvelope =
    storedState && isFlowStateEnvelope(storedState.state)
      ? storedState.state
      : null;

  // Extract shared context from previous flow
  const sharedContext = storedEnvelope
    ? extractSharedContext(storedEnvelope)
    : undefined;

  // Route the message to determine the flow
  const decision = await routeAgentMessage({
    message,
    memberId: member.id,
    memberExists: Boolean(member.onboardingCompletedAt),
    db,
    conversationHistory,
  });

  let responseText = "";

  // State management helpers
  const saveFlowState = async (
    flow: string,
    state: Record<string, unknown>,
    contextUpdates?: Partial<Record<string, unknown>>
  ) => {
    const mergedContext = contextUpdates
      ? mergeSharedContext(sharedContext, contextUpdates)
      : sharedContext;
    await saveBookingState(
      db,
      member.id,
      wrapFlowState(flow, state, mergedContext)
    );
  };
  const clearFlowState = async () => {
    await clearBookingState(db, member.id);
  };

  // Check for course correction (user wants to change their mind mid-flow)
  if (storedEnvelope && (await isCourseCorrection(message))) {
    const currentFlow = storedEnvelope.flow;

    if (currentFlow === "booking-new") {
      responseText =
        "I understand you want to change your booking. Let's start fresh. What would you like to book for?";
      await clearFlowState();
      return { responseText, flow: "booking-new" };
    }

    if (currentFlow === "modify") {
      responseText = "I'll cancel this modification. What would you like to do instead?";
      await clearFlowState();
      return { responseText, flow: "clarify" };
    }

    if (currentFlow === "cancel") {
      responseText = "I'll cancel this. How can I help you?";
      await clearFlowState();
      return { responseText, flow: "clarify" };
    }

    responseText = "No problem, let's start over. How can I help you today?";
    await clearFlowState();
    return { responseText, flow: "clarify" };
  }

  // Execute appropriate flow
  if (decision.flow === "onboarding") {
    const result = await runOnboardingFlow({
      message,
      phoneNumber: member.phoneNumber,
      existingMemberId: member.id,
      db,
      existingState:
        storedEnvelope?.flow === "onboarding"
          ? (storedEnvelope.data as Parameters<
              typeof runOnboardingFlow
            >[0]["existingState"])
          : undefined,
    });

    if (result.type === "submitted") {
      await clearFlowState();
      responseText = `Welcome, ${result.payload.name}! You're all set up. How can I help you book a tee time?`;
    } else if (
      result.type === "ask" ||
      result.type === "confirm-default" ||
      result.type === "confirm-skip"
    ) {
      await saveFlowState("onboarding", result.nextState);
      responseText = result.prompt;
    } else if (result.type === "clarify") {
      responseText = result.prompt;
    }
  } else if (decision.flow === "support") {
    const result = await runSupportHandoffFlow({
      message,
      memberId: member.id,
      existingState:
        storedEnvelope?.flow === "support"
          ? (storedEnvelope.data as Parameters<
              typeof runSupportHandoffFlow
            >[0]["existingState"])
          : undefined,
    });

    if (result.type === "handoff") {
      const summary =
        result.payload.summary ?? result.payload.reason ?? "Support request";
      await createSupportRequest(db, {
        memberId: member.id,
        message: summary,
      });
      await clearFlowState();
      responseText =
        "I've notified our staff about your request. Someone will reach out to you shortly.";
    } else {
      if (result.type === "confirm-handoff") {
        await saveFlowState("support", result.nextState);
      }
      responseText = result.prompt;
    }
  } else if (decision.flow === "cancel-booking") {
    const d = decision.decision;
    if (d.type === "cancelled") {
      await clearFlowState();
      responseText = d.message;
    } else if (d.type === "offer-booking") {
      await saveFlowState("cancel-booking", { offerBooking: true });
      responseText = d.prompt;
    } else if (d.type === "confirm-cancel") {
      await saveFlowState("cancel-booking", d.nextState);
      responseText = d.prompt;
    } else if (d.type === "need-booking-info") {
      await saveFlowState("cancel-booking", d.nextState);
      responseText = d.prompt;
    } else if (d.type === "lookup") {
      await saveFlowState("cancel-booking", d.nextState);
      responseText = d.prompt ?? "Looking up booking...";
    } else if (d.type === "not-allowed" || d.type === "not-found") {
      responseText = d.prompt;
    } else if (d.type === "clarify") {
      responseText = d.prompt;
    }
  } else if (decision.flow === "booking-status") {
    const d = decision.decision;
    if (d.type === "respond") {
      responseText = d.message;
      if (d.offerBooking) {
        await saveFlowState("booking-status", { offerBooking: true });
      }
      if (d.allowSelection && d.selectionOptions?.length) {
        await saveFlowState("booking-status", {
          allowSelection: true,
          selectionOptions: d.selectionOptions,
        });
      }
    } else if (d.type === "need-booking-info") {
      await saveFlowState("booking-status", d.nextState);
      responseText = d.prompt;
    } else if (d.type === "clarify") {
      responseText = d.prompt;
    } else if (d.type === "not-found") {
      responseText = d.prompt;
    }
  } else if (decision.flow === "modify-booking") {
    const d = decision.decision;
    if (d.type === "update") {
      const payload = d.payload;
      const summaryParts = [
        payload.bookingId ? `Booking ID: ${payload.bookingId}` : null,
        payload.bookingReference ? `Reference: ${payload.bookingReference}` : null,
        payload.club ? `Club: ${payload.club}` : null,
        payload.clubLocation ? `Location: ${payload.clubLocation}` : null,
        payload.preferredDate ? `Date: ${payload.preferredDate}` : null,
        payload.preferredTime ? `Time: ${payload.preferredTime}` : null,
        payload.players ? `Players: ${payload.players}` : null,
        payload.guestNames ? `Guests: ${payload.guestNames}` : null,
        payload.notes ? `Notes: ${payload.notes}` : null,
      ].filter(Boolean);
      await createSupportRequest(db, {
        memberId: member.id,
        message:
          summaryParts.length > 0
            ? `Modify booking request:\n${summaryParts.join("\n")}`
            : "Modify booking request",
      });
      await clearFlowState();
      responseText = "Got it. I'll send that update request to staff.";
    } else if (d.type === "offer-booking") {
      await saveFlowState("modify-booking", { offerBooking: true });
      responseText = d.prompt;
    } else if (
      d.type === "lookup" ||
      d.type === "need-booking-info" ||
      d.type === "confirm-update"
    ) {
      await saveFlowState("modify-booking", d.nextState);
      responseText = d.prompt;
    } else if (d.type === "clarify") {
      responseText = d.prompt;
    }
  } else if (decision.flow === "booking-new") {
    const d = decision.decision;
    if (d.type === "ask" || d.type === "ask-alternatives") {
      responseText = d.prompt;
    } else if (d.type === "confirm-default") {
      responseText = d.prompt;
    } else if (d.type === "review") {
      responseText = d.summary;
    } else if (d.type === "submitted") {
      responseText = `[Submitted] ${d.message}`;
    } else if (d.type === "submit") {
      responseText = "Processing booking request...";
    } else if (d.type === "clarify") {
      responseText = d.prompt;
    }
  } else if (decision.flow === "faq") {
    const d = decision.decision;
    if (d.type === "answer") {
      responseText = d.answer;
    } else if (d.type === "escalate") {
      responseText = "Escalating to staff.";
    } else {
      responseText = d.prompt;
    }
  } else if (decision.flow === "clarify") {
    responseText = decision.prompt;
  } else {
    responseText = "I'm not sure how to handle that yet.";
  }

  return {
    responseText,
    flow: decision.flow,
  };
}
