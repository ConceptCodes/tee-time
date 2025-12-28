import type { EvalScenario, ScenarioExpectation } from "./types";

const fallbackTemplates: Array<{ id: string; name: string; turns: string[]; expect: ScenarioExpectation }> = [
  { id: "fallback-support-1", name: "Explicit support request", turns: ["I need to talk to a human agent."], expect: { flow: "support" } },
  { id: "fallback-support-2", name: "Support escalation", turns: ["Please connect me to staff."], expect: { flow: "support" } },
  { id: "fallback-support-3", name: "Help with issue", turns: ["I have a problem and need help from a real person"], expect: { flow: "support" } },
  { id: "fallback-support-4", name: "Speak to manager", turns: ["Can I speak to a manager?"], expect: { flow: "support" } },
  { id: "fallback-clarify-1", name: "Gibberish input", turns: ["asdlkjasdkljasd"], expect: { flow: "clarify" } },
  { id: "fallback-clarify-2", name: "Vague request", turns: ["Help."], expect: { flow: ["clarify", "support"] } },
  { id: "fallback-clarify-3", name: "Single word", turns: ["golf"], expect: { flow: ["clarify", "faq", "booking-new"] } },
  { id: "fallback-clarify-4", name: "Emoji only", turns: ["⛳️"], expect: { flow: ["clarify", "booking-new"] } },
];

export const buildFallbackScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  return fallbackTemplates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "fallback" as const }));
};
