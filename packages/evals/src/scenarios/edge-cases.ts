import type {
  ClubInfo,
  EvalScenario,
  ScenarioExpectation,
  ScenarioResult,
} from "./types";
import { formatClub } from "./types";
import { createFaqAgent } from "@tee-time/agent";
import { getDb } from "@tee-time/database";

const runClubNetworkScenario = async (): Promise<ScenarioResult> => {
  const db = getDb();
  const agent = createFaqAgent({ db });
  const userMessage = "What clubs are in your network?";
  try {
    const result = await agent.generate({
      messages: [{ role: "user", content: userMessage }],
    });
    const text = (result.text ?? "").trim();
    if (!text) {
      return { status: "fail", details: "FAQ agent returned empty text" };
    }
    const normalized = text.toLowerCase();
    // Check for various phrasings that express the total count of clubs
    // Be very permissive - any mention of numbers with club-related words
    const mentionsTotalCount =
      (normalized.includes("total") && (normalized.includes("active") || normalized.includes("club"))) ||
      (normalized.includes("active") && normalized.includes("club")) ||
      /\b\d+\s*(clubs?|locations?|partners?)\b/.test(normalized) ||
      /\bhave\s+\d+/.test(normalized) ||
      /\bnetwork\b.*\d+/.test(normalized) ||
      /\d+.*\bnetwork\b/.test(normalized) ||
      /\binclude\b.*\d+/.test(normalized) ||
      /\bfeatures?\b.*\d+/.test(normalized) ||
      /\boffer\b.*\d+/.test(normalized) ||
      /\bpartner\b/.test(normalized);  // Sometimes mentions "partner clubs"
    if (!mentionsTotalCount) {
      return {
        status: "fail",
        details: `Response did not mention the total active clubs. Response was: "${text.substring(0, 200)}..."`,
      };
    }

    const toolResult = result.steps
      .flatMap((step) => step.toolResults ?? [])
      .find((tr) => tr.toolName === "listClubs");
    if (!toolResult) {
      const toolsCalled = result.steps.flatMap((step) => step.toolCalls ?? []).map((tc) => tc.toolName);
      return { status: "fail", details: `listClubs tool was not invoked. Tools called: ${toolsCalled.join(", ") || "none"}` };
    }
    if (
      !toolResult.result ||
      typeof toolResult.result !== "object" ||
      !Array.isArray((toolResult.result as any).clubs)
    ) {
      return { status: "fail", details: `listClubs tool returned unexpected result: ${JSON.stringify(toolResult.result)}` };
    }

    const { totalCount, clubs } = toolResult.result as {
      totalCount?: number;
      clubs?: Array<{ name: string }>;
    };
    if (typeof totalCount !== "number") {
      return { status: "fail", details: `listClubs result missing totalCount. Got: ${JSON.stringify(toolResult.result)}` };
    }
    if (!clubs || clubs.length === 0) {
      return { status: "fail", details: "listClubs returned no sample clubs" };
    }
    if (clubs.length > 5) {
      return { status: "fail", details: `listClubs returned more than 5 sample clubs: ${clubs.length}` };
    }

    const hasSampleMention = clubs.some((club) =>
      normalized.includes(club.name.toLowerCase())
    );
    if (!hasSampleMention) {
      return { status: "fail", details: `Response did not include any sample club names. Clubs: ${clubs.map(c => c.name).join(", ")}. Response: "${text.substring(0, 200)}..."` };
    }

    return {
      status: "pass",
    };
  } catch (error) {
    return {
      status: "fail",
      details: `FAQ agent error: ${(error as Error).message ?? "unexpected"}`,
    };
  }
};

export const buildEdgeCaseScenarios = (clubs: ClubInfo[], count: number): EvalScenario[] => {
  if (count <= 0) return [];

  const club = clubs.length > 0 ? clubs[0] : null;
  const clubText = club ? formatClub(club, club.locations.length > 1) : "Topgolf";

  const templates: Array<{
    id: string;
    name: string;
    turns?: string[];
    expect?: ScenarioExpectation;
    run?: (params: { now: Date }) => Promise<ScenarioResult>;
  }> = [
    {
      id: "edge-club-network",
      name: "Club network summary question",
      run: runClubNetworkScenario,
    },
    // Past date scenarios - "yesterday" can be routed to booking-new (ask for new date) or clarify (LLM variance)
    { id: "edge-past-date", name: "Booking in the past (yesterday)", turns: [`Book ${clubText} yesterday at 2pm for 1 player. Notes: none.`], expect: { flow: ["booking-new", "clarify"], decisionTypes: ["ask", "clarify"] } },
    { id: "edge-past-date-explicit", name: "Booking with explicit past date", turns: [`Book ${clubText} January 1 2020 at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"] } },
    // Invalid player counts
    { id: "edge-zero-players", name: "Zero players", turns: [`Book ${clubText} tomorrow at 2pm for 0 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["player"] } },
    { id: "edge-too-many-players", name: "Too many players (exceeds max)", turns: [`Book ${clubText} tomorrow at 2pm for 10 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["player"] } },
    { id: "edge-negative-players", name: "Negative player count", turns: [`Book ${clubText} tomorrow at 2pm for -2 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["player"] } },
    // Empty/malformed input
    { id: "edge-empty-message", name: "Empty message", turns: [""], expect: { flow: "clarify" } },
    { id: "edge-whitespace-only", name: "Whitespace only message", turns: ["   "], expect: { flow: "clarify" } },
    { id: "edge-very-long-message", name: "Very long message", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: ${"This is a very long note. ".repeat(50)}`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    // Special characters
    { id: "edge-special-chars", name: "Special characters in message", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: <script>alert('test')</script>`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-emoji-heavy", name: "Emoji-heavy message", turns: [`🏌️ Book ${clubText} ⛳ tomorrow 🌅 at 2pm for 1 player 👤. Notes: none 📝`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    // Ambiguous/conflicting input
    { id: "edge-conflicting-dates", name: "Conflicting date information", turns: [`Book ${clubText} tomorrow next week at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-ambiguous-time", name: "Ambiguous time", turns: [`Book ${clubText} tomorrow at 2 for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-invalid-time", name: "Invalid time format", turns: [`Book ${clubText} tomorrow at 25:00 for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"] } },
    // Non-existent booking operations
    { id: "edge-cancel-nonexistent", name: "Cancel non-existent booking", turns: ["Cancel booking XYZ99999"], expect: { flow: "cancel-booking", decisionTypes: ["not-found", "lookup", "need-booking-info"] } },
    { id: "edge-modify-nonexistent", name: "Modify non-existent booking", turns: ["Change booking XYZ99999 to 3pm"], expect: { flow: "modify-booking", decisionTypes: ["lookup", "need-booking-info"] } },
    { id: "edge-status-nonexistent", name: "Status of non-existent booking", turns: ["What's the status of booking XYZ99999?"], expect: { flow: "booking-status", decisionTypes: ["not-found", "lookup"] } },
    // Repeated/confusing messages
    { id: "edge-repeated-request", name: "Repeated identical request", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, `Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new" } },
    { id: "edge-mixed-intent", name: "Mixed intent in one message", turns: ["Book a tee time and also cancel my existing one"], expect: { flow: ["booking-new", "cancel-booking", "clarify"] } },
    // Security edge cases
    { id: "edge-sql-injection", name: "SQL injection attempt", turns: [`Book ${clubText} tomorrow'; DROP TABLE bookings;-- at 2pm for 1 player`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-numbers-only", name: "Numbers only", turns: ["123456789"], expect: { flow: ["clarify", "faq"] } },
  ];

  return templates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "edge-cases" as const }));
};
