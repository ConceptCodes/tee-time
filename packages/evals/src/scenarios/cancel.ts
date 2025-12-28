import type { EvalScenario, ScenarioExpectation } from "./types";

const cancelBookingTemplates: Array<{
  id: string;
  name: string;
  turns: string[];
  expect: ScenarioExpectation;
}> = [
  { id: "cancel-tomorrow", name: "Cancel tomorrow's booking", turns: ["Cancel my booking for tomorrow"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "not-found", "offer-booking"] } },
  { id: "cancel-explicit", name: "Explicit cancel request", turns: ["I need to cancel my tee time"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "need-booking-info", "offer-booking"] } },
  { id: "cancel-reference", name: "Cancel by reference", turns: ["Cancel booking ABC123"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "not-found", "lookup"] } },
  { id: "cancel-specific-date", name: "Cancel specific date", turns: ["Cancel my Friday 2pm booking"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "not-found", "lookup"] } },
  { id: "cancel-informal", name: "Informal cancel", turns: ["nvm cancel that booking"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "need-booking-info", "offer-booking"] } },
  { id: "cancel-with-reason", name: "Cancel with reason", turns: ["I need to cancel my booking, something came up"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "need-booking-info", "offer-booking"] } },
  { id: "cancel-next-booking", name: "Cancel next booking", turns: ["Cancel my next booking please"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "not-found", "offer-booking"] } },
  { id: "cancel-cant-make-it", name: "Can't make it", turns: ["I can't make it to my tee time, please cancel"], expect: { flow: "cancel-booking", decisionTypes: ["confirm-cancel", "need-booking-info", "offer-booking"] } },
];

export const buildCancelBookingScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  return cancelBookingTemplates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "cancel" as const }));
};
