import type { ClubInfo, EvalScenario, ScenarioExpectation } from "./types";
import { formatClub } from "./types";

export const buildEdgeCaseScenarios = (clubs: ClubInfo[], count: number): EvalScenario[] => {
  if (count <= 0) return [];

  const club = clubs.length > 0 ? clubs[0] : null;
  const clubText = club ? formatClub(club, club.locations.length > 1) : "Topgolf";

  const templates: Array<{ id: string; name: string; turns: string[]; expect: ScenarioExpectation }> = [
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
