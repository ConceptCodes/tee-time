import { Hono } from "hono";
import { convertToModelMessages, type UIMessage } from "ai";
import { getDb } from "@tee-time/database";
import { createMemberRepository } from "@tee-time/database";
import { createBookingAgent } from "@tee-time/agent";
import { createMemberProfile } from "@tee-time/core";
import type { ApiVariables } from "../middleware/types";
import { rateLimit } from "../middleware/rate-limit";

const chatRoutes = new Hono<{ Variables: ApiVariables }>();

// Demo configuration from environment
const TEST_PHONE = process.env.DEMO_PHONE_NUMBER ?? "+15550009999";
const DEMO_MODE = process.env.DEMO_MODE === "true";
const DEFAULT_TIMEZONE = "Etc/UTC";

// Apply rate limiting: 10 requests per minute
chatRoutes.post("/", rateLimit(10, 60000), async (c) => {
  try {
    // Check if demo mode is enabled
    if (!DEMO_MODE) {
      return c.json({ error: "Demo mode is disabled" }, 403);
    }

    const body = await c.req.json();
    const { messages } = body as { messages: UIMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Invalid request: messages array required" }, 400);
    }

    const db = getDb();
    const memberRepo = createMemberRepository(db);

    // Get or create demo member
    let member = await memberRepo.getByPhoneNumber(TEST_PHONE);
    if (!member) {
      const now = new Date();
      member = await createMemberProfile(db, {
        phoneNumber: TEST_PHONE,
        name: "Demo User",
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

    // Create the booking agent with database access for tools
    const agent = createBookingAgent({ db });

    // Convert UI messages to agent messages
    const modelMessages = await convertToModelMessages(messages);

    // Stream the response directly from the agent
    const result = await agent.stream({
      messages: modelMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content as any,
      })),
    });

    // Return the streaming response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { chatRoutes };
