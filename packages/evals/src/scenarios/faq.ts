import type { EvalScenario } from "./types";
import { withSuffix } from "./types";

export const buildFaqScenarios = (questions: string[], count: number): EvalScenario[] => {
  if (count <= 0) return [];
  if (questions.length === 0) {
    return [{ id: "faq-skip", name: "FAQ scenarios skipped", suite: "faq", skipReason: "No active FAQ entries available" }];
  }

  const scenarios: EvalScenario[] = [];
  for (let i = 0; i < count; i += 1) {
    const question = questions[i % questions.length];
    const suffix = i >= questions.length ? "please" : "";
    const prompt = suffix ? withSuffix(question, suffix) : question;
    scenarios.push({ id: `faq-${i + 1}`, name: "FAQ query", suite: "faq", turns: [prompt], expect: { flow: "faq", decisionTypes: ["answer"] } });
  }
  return scenarios;
};
