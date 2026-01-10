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
      /\bpartner\b/.test(normalized);
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
    { id: "edge-past-date", name: "Booking in the past (yesterday)", turns: [`Book ${clubText} yesterday at 2pm for 1 player. Notes: none.`], expect: { flow: ["booking-new", "clarify"], decisionTypes: ["ask", "clarify"] } },
    { id: "edge-past-date-explicit", name: "Booking with explicit past date", turns: [`Book ${clubText} January 1 2020 at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"] } },
    { id: "edge-zero-players", name: "Zero players", turns: [`Book ${clubText} tomorrow at 2pm for 0 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["players", "player"] } },
    { id: "edge-too-many-players", name: "Too many players (exceeds max)", turns: [`Book ${clubText} tomorrow at 2pm for 10 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["players", "player"] } },
    { id: "edge-negative-players", name: "Negative player count", turns: [`Book ${clubText} tomorrow at 2pm for -2 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["players", "player"] } },
    { id: "edge-empty-message", name: "Empty message", turns: [""], expect: { flow: "clarify" } },
    { id: "edge-whitespace-only", name: "Whitespace only message", turns: ["   "], expect: { flow: "clarify" } },
    { id: "edge-very-long-message", name: "Very long message", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: ${"This is a very long note. ".repeat(50)}`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-special-chars", name: "Special characters in message", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: <script>alert('test')</script>`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-emoji-heavy", name: "Emoji-heavy message", turns: [`🏌️ Book ${clubText} ⛳ tomorrow 🌅 at 2pm for 1 player 👤. Notes: none 📝`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-conflicting-dates", name: "Conflicting date information", turns: [`Book ${clubText} tomorrow next week at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-ambiguous-time", name: "Ambiguous time", turns: [`Book ${clubText} tomorrow at 2 for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-invalid-time", name: "Invalid time format", turns: [`Book ${clubText} tomorrow at 25:00 for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"] } },
    { id: "edge-cancel-nonexistent", name: "Cancel non-existent booking", turns: ["Cancel booking XYZ99999"], expect: { flow: "cancel-booking", decisionTypes: ["not-found", "lookup", "need-booking-info"] } },
    { id: "edge-modify-nonexistent", name: "Modify non-existent booking", turns: ["Change booking XYZ99999 to 3pm"], expect: { flow: "modify-booking", decisionTypes: ["lookup", "need-booking-info"] } },
    { id: "edge-status-nonexistent", name: "Status of non-existent booking", turns: ["What's the status of booking XYZ99999?"], expect: { flow: "booking-status", decisionTypes: ["not-found", "lookup"] } },
    { id: "edge-repeated-request", name: "Repeated identical request", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, `Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new" } },
    { id: "edge-mixed-intent", name: "Mixed intent in one message", turns: ["Book a tee time and also cancel my existing one"], expect: { flow: ["booking-new", "cancel-booking", "clarify"] } },
    { id: "edge-sql-injection", name: "SQL injection attempt", turns: [`Book ${clubText} tomorrow'; DROP TABLE bookings;-- at 2pm for 1 player`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-numbers-only", name: "Numbers only", turns: ["123456789"], expect: { flow: ["clarify", "faq"] } },
    { id: "edge-tomorrow-near-midnight", name: "Tomorrow booking near midnight", turns: [`Book ${clubText} tomorrow at 2am for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-leap-year", name: "Leap year date (Feb 29)", turns: [`Book ${clubText} February 29 at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-invalid-month-day", name: "Invalid date (Feb 30)", turns: [`Book ${clubText} February 30 at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["date"] } },
    { id: "edge-holiday-reference", name: "Holiday date reference", turns: [`Book ${clubText} Christmas at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-next-weekend", name: "This weekend (ambiguous)", turns: [`Book ${clubText} this weekend at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-end-of-month", name: "End of month date (April 31)", turns: [`Book ${clubText} April 31 at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["date"] } },
    { id: "edge-correction-mid-booking", name: "Correct wrong info mid-booking", turns: [`Book ${clubText} tomorrow at 2pm for 2 players. Notes: none.`, "Actually make it 3pm", "And make it 1 player instead"], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-intent-switch-mid-conversation", name: "Switch to FAQ during booking", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, "Wait, what's the cancellation policy?"], expect: { flow: ["booking-new", "faq", "clarify"] } },
    { id: "edge-contradictory-input", name: "Contradictory information", turns: [`Book ${clubText} tomorrow at 2pm for 2 players. Notes: none.`, "Actually I want to book today instead", "Never mind, tomorrow is fine"], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-partial-then-confirm", name: "Confirm before providing all fields", turns: [`Book ${clubText} for 1 player. Notes: none.`, "Yes that's correct"], expect: { flow: "booking-new", decisionTypes: ["ask"] } },
    { id: "edge-cancellation-window-boundary", name: "Cancel at 60-minute window boundary", turns: ["Cancel my booking for tomorrow at 2pm"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "not-found", "need-booking-info"] } },
    { id: "edge-club-name-ambiguity", name: "Ambiguous club name", turns: ["Book at Topgolf tomorrow at 2pm for 1 player. Notes: none."], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-time-window-24h", name: "24-hour time window", turns: [`Book ${clubText} tomorrow between 9am and 9pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-noon-midnight", name: "Special time keywords (noon/midnight)", turns: [`Book ${clubText} tomorrow at noon for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-proxy-booking", name: "Booking for someone else (proxy)", turns: ["Book for my wife tomorrow at 2pm for 1 player. Notes: none."], expect: { flow: ["booking-new", "clarify"] } },
    { id: "edge-implicit-context", name: "Implicit reference to previous booking", turns: ["Book same time next week"], expect: { flow: ["booking-new", "booking-status", "clarify"] } },
    { id: "edge-unclear-club", name: "Unclear which club", turns: ["Book a tee time at that club we went to last time"], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["club"] } },
    { id: "edge-multiple-requests-one-message", name: "Multiple booking requests in one message", turns: ["Book 2pm today and also book next Friday at 3pm"], expect: { flow: ["booking-new", "clarify"] } },
    { id: "edge-whatsapp-limit", name: "Message at WhatsApp 1600 char limit", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: ${"a".repeat(1500)}`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-unicode-heavy", name: "Unicode and special characters", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: José María Müller 漢字 emoji 🎳`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-formatting-abuse", name: "Excessive formatting characters", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: ***IMPORTANT*** ---urgent---`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-rapid-fire-booking", name: "Multiple booking attempts rapidly", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, `Book ${clubText} tomorrow at 3pm for 1 player. Notes: none.`, `Book ${clubText} tomorrow at 4pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-contradictory-modify", name: "Modify with contradictory info", turns: ["Change my booking", "Never mind don't change it", "Actually yes change it to 3pm"], expect: { flow: ["modify-booking", "clarify"] } },
    { id: "edge-very-small-decimal", name: "Decimal player count", turns: [`Book ${clubText} tomorrow at 2pm for 2.5 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["players", "player"] } },
    { id: "edge-very-large-number", name: "Extremely large player count", turns: [`Book ${clubText} tomorrow at 2pm for 999999 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["players", "player"] } },
    { id: "edge-negative-decimal", name: "Negative decimal player count", turns: [`Book ${clubText} tomorrow at 2pm for -1.5 players. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["players", "player"] } },
    { id: "edge-cancel-then-book", name: "Cancel then immediately book new", turns: ["Cancel my booking", "Actually book one for tomorrow at 2pm"], expect: { flow: ["cancel-booking", "booking-new"] } },
    { id: "edge-status-then-modify", name: "Check status then modify", turns: ["What's my booking status?", "Change it to 3pm"], expect: { flow: ["booking-status", "modify-booking"] } },
    { id: "edge-no-bays-available", name: "No bays available (system should handle gracefully)", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["ask-alternatives", "review", "ask"] } },
    { id: "edge-single-bay-limit", name: "Single bay available test", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-favorite-club-override", name: "Override favorite club preference", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, "No, use that other club instead"], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-timezone-explicit", name: "Explicit timezone mention", turns: [`Book ${clubText} tomorrow at 2pm EST for 1 player. Notes: none.`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-html-injection", name: "HTML injection attempt", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: <img src=x onerror=alert(1)>`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-path-traversal", name: "Path traversal attempt", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: ../../../etc/passwd`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-command-injection", name: "Command injection attempt", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: ; rm -rf /`], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "edge-contraction-expansion", name: "Greeting with booking request", turns: ["Hey I'd like to book a tee time at that club tomorrow at 2pm for 1 player"], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-sentence-fragment", name: "Sentence fragments", turns: ["Tomorrow. 2pm. 2 players."], expect: { flow: "booking-new", decisionTypes: ["ask", "review"] } },
    { id: "edge-context-switch", name: "Context switch in single message", turns: ["Book tomorrow but also answer: what's your cancellation policy?"], expect: { flow: ["booking-new", "faq", "clarify"] } },
  ];

  return templates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "edge-cases" as const }));
};
