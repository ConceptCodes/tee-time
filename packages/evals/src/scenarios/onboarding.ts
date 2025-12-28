import type { EvalScenario, ScenarioExpectation } from "./types";

const onboardingTemplates: Array<{
  id: string;
  name: string;
  turns: string[];
  expect: ScenarioExpectation;
}> = [
  { id: "onboard-first-message", name: "First message from new user", turns: ["Hi, I want to book a tee time"], expect: { flow: "onboarding" } },
  { id: "onboard-greeting", name: "Simple greeting", turns: ["Hello"], expect: { flow: "onboarding" } },
  { id: "onboard-help", name: "Help request from new user", turns: ["Can you help me book a golf session?"], expect: { flow: "onboarding" } },
  { id: "onboard-question", name: "Question from new user", turns: ["What times are available tomorrow?"], expect: { flow: "onboarding" } },
  { id: "onboard-informal", name: "Informal first contact", turns: ["yo whats up"], expect: { flow: "onboarding" } },
];

export const buildOnboardingScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  return onboardingTemplates.slice(0, count).map((t, i) => ({
    ...t,
    id: `${t.id}-${i + 1}`,
    suite: "onboarding" as const,
  }));
};
