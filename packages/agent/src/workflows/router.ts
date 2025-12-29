import { generateObject } from "ai";
import {
  clearBookingState,
  getBookingState,
  getFlowFromState,
  isFlowStateEnvelope,
} from "@tee-time/core";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { runFaqFlow, type FaqFlowDecision, type FaqFlowInput } from "./faq";
import {
  runBookingStatusFlow,
  type BookingStatusFlowDecision,
  type BookingStatusFlowInput,
} from "./booking-status";
import {
  runBookingIntakeFlow,
  type BookingIntakeDecision,
  type BookingIntakeInput,
} from "./booking-intake";
import {
  runCancelBookingFlow,
  type CancelBookingDecision,
  type CancelBookingInput,
} from "./cancel-booking";
import {
  runModifyBookingFlow,
  type ModifyBookingDecision,
  type ModifyBookingInput,
} from "./modify-booking";
import { isConfirmationMessage, isNegativeReply, looksLikeFollowup, debugLog } from "../utils";

import type { Database } from "@tee-time/database";

export type RouterInput = {
  message: string;
  memberId?: string;
  locale?: string;
  memberExists?: boolean;
  db?: Database;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export type RouterDecision =
  | {
      flow: "faq";
      decision: FaqFlowDecision;
    }
  | {
      flow: "booking-status";
      decision: BookingStatusFlowDecision;
    }
  | {
      flow: "booking-new";
      decision: BookingIntakeDecision;
    }
  | {
      flow: "cancel-booking";
      decision: CancelBookingDecision;
    }
  | {
      flow: "modify-booking";
      decision: ModifyBookingDecision;
    }
  | {
      flow: "onboarding";
    }
  | {
      flow: "support";
    }
  | {
      flow: "clarify";
      prompt: string;
    };

const RouterSchema = z.object({
  flow: z.enum([
    "faq",
    "booking-new",
    "booking-status",
    "cancel-booking",
    "modify-booking",
    "support",
    "clarify",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string().nullable(),
});

// NOTE: Removed isBookingStatusQuery regex heuristic - let LLM handle intent detection

export const routeAgentMessage = async (
  input: RouterInput
): Promise<RouterDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      flow: "clarify",
      prompt:
        "I can help book a tee time, update or cancel a booking, check booking status, or answer club FAQs. What can I help with?",
    };
  }

  try {
    if (input.memberExists === false) {
      return { flow: "onboarding" };
    }

    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();

    let contextNote = "";
    let activeFlow: string | null = null;
    let activeData: Record<string, unknown> | null = null;
    if (input.db && input.memberId) {
      const activeState = await getBookingState<Record<string, unknown>>(
        input.db,
        input.memberId
      );
      if (activeState?.state) {
        activeFlow = getFlowFromState(activeState.state);
        if (isFlowStateEnvelope(activeState.state)) {
          activeData = activeState.state.data;
        } else {
          activeData = activeState.state;
        }
      }
      const isOfferBookingState = Boolean(
        activeData &&
          typeof activeData === "object" &&
          "offerBooking" in activeData &&
          activeData.offerBooking === true
      );
      const shouldUseActiveFlow = !isOfferBookingState;

      if (activeFlow && isOfferBookingState) {
        if (isConfirmationMessage(message)) {
          return {
            flow: "booking-new",
            decision: await runBookingIntakeFlow(input as BookingIntakeInput),
          };
        }
        if (isNegativeReply(message)) {
          if (input.db && input.memberId) {
            await clearBookingState(input.db, input.memberId);
          }
          return {
            flow: "clarify",
            prompt:
              "No problem. If you want to book a tee time later, just let me know.",
          };
        }
      }

      if (
        shouldUseActiveFlow &&
        activeFlow &&
        activeData &&
        Object.keys(activeData).length > 0
      ) {
        contextNote =
          "\nIMPORTANT CONTEXT: User has an active flow in progress. ";
        contextNote +=
          "The user is likely answering a recent question (e.g. a club name, location, date, time, or confirmation). ";
        contextNote += `If the message looks like an answer or confirmation, YOU MUST SELECT '${activeFlow}'. Do NOT choose 'clarify'.`;
        contextNote += `\nActive flow: ${activeFlow}`;
        contextNote += `\nPrevious state keys: ${Object.keys(activeData).join(", ")}`;
      }
    }

    debugLog("Router Active State:", contextNote ? "FOUND" : "NONE");

    // Fast-path: If user sends a confirmation message during an active booking flow,
    // route directly to booking-new without LLM to preserve state and avoid errors
    if (
      activeFlow === "booking-new" &&
      activeData &&
      Object.keys(activeData).length > 0 &&
      isConfirmationMessage(message) &&
      !(
        typeof activeData === "object" &&
        "offerBooking" in activeData &&
        activeData.offerBooking === true
      )
    ) {
      debugLog("Router: Confirmation fast-path for booking-new");
      return {
        flow: "booking-new",
        decision: await runBookingIntakeFlow(input as BookingIntakeInput),
      };
    }

    if (
      activeFlow &&
      activeData &&
      Object.keys(activeData).length > 0 &&
      (looksLikeFollowup(message) ||
        (activeFlow === "booking-new" &&
          /(change|edit|update|actually|instead|make it|move it)/.test(
            message.toLowerCase()
          ))) &&
      !(
        typeof activeData === "object" &&
        "offerBooking" in activeData &&
        activeData.offerBooking === true
      )
    ) {
      if (activeFlow === "booking-new") {
        return {
          flow: "booking-new",
          decision: await runBookingIntakeFlow(input as BookingIntakeInput),
        };
      }
      if (activeFlow === "cancel-booking") {
        return {
          flow: "cancel-booking",
          decision: await runCancelBookingFlow({
            ...(input as CancelBookingInput),
            existingState: activeData as CancelBookingInput["existingState"],
          }),
        };
      }
      if (activeFlow === "modify-booking") {
        return {
          flow: "modify-booking",
          decision: await runModifyBookingFlow({
            ...(input as ModifyBookingInput),
            existingState: activeData as ModifyBookingInput["existingState"],
          }),
        };
      }
      if (activeFlow === "booking-status") {
        return {
          flow: "booking-status",
          decision: await runBookingStatusFlow(input as BookingStatusFlowInput),
        };
      }
      if (activeFlow === "support") {
        return { flow: "support" };
      }
    }

    // Removed regex-based status detection - LLM handles this via prompt

    const historyContext = input.conversationHistory?.length
      ? `\nConversation history:\n${input.conversationHistory
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}\n`
      : "";

    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: RouterSchema,
      system:
        "You are a router for a tee-time booking assistant. Choose the best flow. " +
        "If the assistant previously said a booking was not available and asked for alternate times, " +
        "and the user replies with a specific time, choose 'booking-new'." +
        contextNote,
      prompt:
        "Given the user message, select one flow:\n" +
        "- booking-new: user wants to book a new tee time.\n" +
        "- booking-status: user asks about existing booking(s), confirmation status, upcoming/past bookings, " +
        "or uses phrases like 'any bookings', 'this week', 'next week', 'do I have'.\n" +
        "- cancel-booking: user wants to cancel an existing booking.\n" +
        "- modify-booking: user wants to reschedule or change details of an existing booking.\n" +
        "- faq: general questions about membership, policies, hours, pricing, dress code, etc.\n" +
        "- support: user asks for human help, has issues, or wants to talk to staff.\n" +
        "- clarify: intent is unclear and doesn't fit any other flow.\n" +
        "Return a JSON object with the flow, confidence (0-1), and a reason (string or null).\n\n" +
        `${historyContext}` +
        `Message: "${message}"`,
    });

    debugLog("Router Decision:", JSON.stringify(result.object));

    if (result.object.flow === "booking-new") {
      return {
        flow: "booking-new",
        decision: await runBookingIntakeFlow(input as BookingIntakeInput),
      };
    }

    if (result.object.flow === "booking-status") {
      return {
        flow: "booking-status",
        decision: await runBookingStatusFlow(input as BookingStatusFlowInput),
      };
    }

    if (result.object.flow === "cancel-booking") {
      return {
        flow: "cancel-booking",
        decision: await runCancelBookingFlow({
          ...(input as CancelBookingInput),
          existingState:
            activeFlow === "cancel-booking" && activeData
              ? (activeData as CancelBookingInput["existingState"])
              : undefined,
        }),
      };
    }

    if (result.object.flow === "modify-booking") {
      return {
        flow: "modify-booking",
        decision: await runModifyBookingFlow({
          ...(input as ModifyBookingInput),
          existingState:
            activeFlow === "modify-booking" && activeData
              ? (activeData as ModifyBookingInput["existingState"])
              : undefined,
        }),
      };
    }

    if (result.object.flow === "faq") {
      return { flow: "faq", decision: await runFaqFlow(input as FaqFlowInput) };
    }

    if (result.object.flow === "support") {
      return { flow: "support" };
    }

    return {
      flow: "clarify",
      prompt:
        "I can help book a new tee time, update or cancel an existing booking, check booking status, and answer FAQs. If you need something else, I can connect you to staff.",
    };
  } catch (error) {
    // Log error but don't mask it - workflow-specific errors should be handled by the workflow
    console.error("Router Error:", error);
    // Re-throw the error so workflow-specific error handling can occur
    // Only catch truly unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("booking_in_past") ||
      errorMessage.includes("booking_too_soon") ||
      errorMessage.includes("bay_unavailable")
    ) {
      // These are handled by the booking flow, but if we got here the flow didn't handle it
      // Return a helpful clarify response
      return {
        flow: "clarify",
        prompt:
          "There was an issue with the booking details. Please provide a valid date and time.",
      };
    }
    return {
      flow: "clarify",
      prompt:
        "I can help book a new tee time, update or cancel an existing booking, check booking status, and answer FAQs. If you need something else, I can connect you to staff.",
    };
  }
};
