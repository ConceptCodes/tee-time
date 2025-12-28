import type { EvalScenario, ScenarioExpectation } from "./types";

const modifyBookingTemplates: Array<{
  id: string;
  name: string;
  turns: string[];
  expect: ScenarioExpectation;
}> = [
  { id: "modify-time", name: "Change booking time", turns: ["Change my booking to 3pm"], expect: { flow: "modify-booking", decisionTypes: ["confirm-update", "need-booking-info", "lookup"] } },
  { id: "modify-date", name: "Reschedule to different date", turns: ["Reschedule my tee time to next week"], expect: { flow: "modify-booking", decisionTypes: ["confirm-update", "need-booking-info", "lookup"] } },
  { id: "modify-add-player", name: "Add a player", turns: ["Add one more player to my booking"], expect: { flow: "modify-booking", decisionTypes: ["confirm-update", "need-booking-info", "lookup"] } },
  { id: "modify-remove-player", name: "Remove a player", turns: ["Actually we'll only be 2 players now"], expect: { flow: "modify-booking", decisionTypes: ["confirm-update", "need-booking-info", "lookup"] } },
  { id: "modify-notes", name: "Update notes", turns: ["Can you add a note to my booking? We'll need a cart"], expect: { flow: "modify-booking", decisionTypes: ["confirm-update", "need-booking-info", "lookup"] } },
  { id: "modify-guest-names", name: "Update guest names", turns: ["Change the guest name to Mike instead of Alex"], expect: { flow: "modify-booking", decisionTypes: ["confirm-update", "need-booking-info", "lookup"] } },
];

export const buildModifyBookingScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  return modifyBookingTemplates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "modify" as const }));
};
