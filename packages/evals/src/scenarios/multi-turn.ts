import type { ClubInfo, EvalScenario, ScenarioExpectation } from "./types";
import { formatClub } from "./types";

export const buildMultiTurnScenarios = (clubs: ClubInfo[], count: number): EvalScenario[] => {
  if (count <= 0) return [];
  if (clubs.length === 0) {
    return [{ id: "multi-turn-skip", name: "Multi-turn scenarios skipped", suite: "multi-turn", skipReason: "No active clubs available" }];
  }

  const club = clubs[0];
  const clubText = formatClub(club, club.locations.length > 1);

  const templates: Array<{ id: string; name: string; turns: string[]; expect: ScenarioExpectation }> = [
    { id: "multi-step-complete", name: "Step-by-step booking completion", turns: ["I want to book a tee time", clubText, "Tomorrow", "2pm", "2 players", "Mike", "none"], expect: { flow: "booking-new", decisionTypes: ["review"] } },
    { id: "multi-confirm-yes", name: "Confirmation with yes", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, "yes"], expect: { flow: "booking-new", decisionTypes: ["submitted", "submit"] } },
    { id: "multi-confirm-ok", name: "Confirmation with ok", turns: [`Book ${clubText} tomorrow at 3pm for 1 player. Notes: none.`, "ok"], expect: { flow: "booking-new", decisionTypes: ["submitted", "submit"] } },
    { id: "multi-confirm-sounds-good", name: "Confirmation with sounds good", turns: [`Book ${clubText} tomorrow at 4pm for 1 player. Notes: none.`, "sounds good"], expect: { flow: "booking-new", decisionTypes: ["submitted", "submit"] } },
    { id: "multi-decline-no", name: "Decline with no", turns: [`Book ${clubText} tomorrow at 5pm for 1 player. Notes: none.`, "no"], expect: { flow: ["booking-new", "clarify"], decisionTypes: ["ask", "review"] } },
    { id: "multi-change-mind", name: "Change mind mid-flow", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, "actually change it to 3pm"], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "multi-add-info", name: "Add missing info", turns: [`Book ${clubText} tomorrow for 2 players. Notes: none.`, "2pm"], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "multi-provide-guests", name: "Provide guest names when asked", turns: [`Book ${clubText} tomorrow at 2pm for 3 players. Notes: none.`, "Alex, Sam"], expect: { flow: "booking-new", decisionTypes: ["review", "ask"] } },
    { id: "multi-switch-intent", name: "Switch from booking to FAQ", turns: [`Book ${clubText} tomorrow at 2pm`, "wait, what are your hours?"], expect: { flow: ["faq", "booking-new"] } },
    { id: "multi-cancel-after-review", name: "Cancel after seeing review", turns: [`Book ${clubText} tomorrow at 2pm for 1 player. Notes: none.`, "nevermind, cancel that"], expect: { flow: ["cancel-booking", "clarify", "booking-new"] } },
  ];

  return templates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "multi-turn" as const }));
};
