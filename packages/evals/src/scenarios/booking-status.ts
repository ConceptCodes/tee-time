import type { EvalScenario, ScenarioExpectation } from "./types";

const bookingStatusTemplates: Array<{
  id: string;
  name: string;
  turns: string[];
  expect: ScenarioExpectation;
}> = [
  { id: "status-upcoming", name: "Check upcoming bookings", turns: ["What are my upcoming bookings?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found"] } },
  { id: "status-next", name: "Check next tee time", turns: ["When is my next tee time?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found"] } },
  { id: "status-tomorrow", name: "Check tomorrow's booking", turns: ["Do I have anything booked for tomorrow?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found"] } },
  { id: "status-past", name: "Check past bookings", turns: ["Show me my past bookings"], expect: { flow: "booking-status", decisionTypes: ["respond"] } },
  { id: "status-reference", name: "Check by reference", turns: ["What's the status of booking ref ABC123?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found", "lookup"] } },
  { id: "status-this-week", name: "Check this week", turns: ["Any bookings this week?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found"] } },
  { id: "status-specific-date", name: "Check specific date", turns: ["Do I have a booking on Friday?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found"] } },
  { id: "status-confirmation", name: "Check booking confirmation", turns: ["Is my booking confirmed?"], expect: { flow: "booking-status", decisionTypes: ["respond", "not-found", "need-booking-info"] } },
];

export const buildBookingStatusScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  return bookingStatusTemplates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "booking-status" as const }));
};
