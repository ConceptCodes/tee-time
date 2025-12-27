import { generateObject } from "ai";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { runFaqFlow, type FaqFlowDecision, type FaqFlowInput } from "./faq";
import {
  runBookingStatusFlow,
  type BookingStatusFlowDecision,
  type BookingStatusFlowInput,
} from "./booking-status";

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
  flow: z.enum(["faq", "booking-status", "support", "clarify"]),
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
        "I can help with tee-time booking status or general club FAQs. What can I help with?",
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
        "- faq: general questions about membership, policies, hours, pricing, etc.\n" +
        "- booking-status: user asks about an existing booking, confirmation, or status.\n" +
        "- support: user asks for human help, has issues, or wants to talk to staff.\n" +
        "- clarify: intent is unclear.\n" +
        "Return only the flow and an optional reason.\n\n" +
        `Message: "${message}"`,
    });

    if (result.object.flow === "booking-status") {
      return {
        flow: "booking-status",
        decision: await runBookingStatusFlow(input as BookingStatusFlowInput),
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
        "I can help with booking status updates and general FAQs about membership, policies, and hours. If you need something else, I can connect you to staff.",
    };
  } catch {
    return {
      flow: "clarify",
      prompt:
        "I can help with booking status updates and general FAQs about membership, policies, and hours. If you need something else, I can connect you to staff.",
    };
  }
};
