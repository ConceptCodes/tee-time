import { generateObject } from "ai";
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

export type RouterInput = {
  message: string;
  memberId?: string;
  locale?: string;
  memberExists?: boolean;
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
  reason: z.string().optional(),
});

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
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: RouterSchema,
      system:
        "You are a router for a tee-time booking assistant. Choose the best flow.",
      prompt:
        "Given the user message, select one flow:\n" +
        "- booking-new: user wants to book a new tee time.\n" +
        "- booking-status: user asks about an existing booking, confirmation, or status.\n" +
        "- cancel-booking: user wants to cancel an existing booking.\n" +
        "- modify-booking: user wants to reschedule or change details of an existing booking.\n" +
        "- faq: general questions about membership, policies, hours, pricing, etc.\n" +
        "- support: user asks for human help, has issues, or wants to talk to staff.\n" +
        "- clarify: intent is unclear.\n" +
        "Return only the flow and an optional reason.\n\n" +
        `Message: "${message}"`,
    });

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
        decision: await runCancelBookingFlow(input as CancelBookingInput),
      };
    }

    if (result.object.flow === "modify-booking") {
      return {
        flow: "modify-booking",
        decision: await runModifyBookingFlow(input as ModifyBookingInput),
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
  } catch {
    return {
      flow: "clarify",
      prompt:
        "I can help book a new tee time, update or cancel an existing booking, check booking status, and answer FAQs. If you need something else, I can connect you to staff.",
    };
  }
};
