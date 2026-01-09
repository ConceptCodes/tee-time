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

const offTopicTemplates: Array<{ id: string; name: string; turns: string[]; expect: ScenarioExpectation }> = [
  { id: "offtopic-sports-1", name: "Non-booking sports question (NBA scores)", turns: ["What are the latest NBA scores?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-sports-2", name: "Sports query outside golf scope", turns: ["Who won the World Cup last year?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-weather", name: "Weather inquiry (out of scope)", turns: ["What's the weather like today?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-news", name: "Current events/news question", turns: ["What's happening in the news today?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-politics", name: "Politics question (completely off-topic)", turns: ["What do you think about the election?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-personal", name: "Personal question (out of scope)", turns: ["What's your favorite color?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-entertainment", name: "Entertainment query (out of scope)", turns: ["What movies are playing this weekend?"], expect: { flow: ["faq", "clarify"] } },
  { id: "offtopic-technical", name: "Technical support outside scope", turns: ["Can you help me fix my WiFi?"], expect: { flow: ["clarify", "support"] } },
  { id: "offtopic-random", name: "Random/nonsensical input", turns: ["Purple monkey dishwasher banana"], expect: { flow: "clarify" } },
  { id: "offtopic-greeting", name: "Greeting and small talk", turns: ["Hi there", "How are you doing?"], expect: { flow: ["clarify"] } },
  { id: "offtopic-inappropriate", name: "Inappropriate content (should reject)", turns: ["Tell me something inappropriate"], expect: { flow: ["clarify", "support"] } },
  { id: "offtopic-competitor", name: "Competitor booking service mention", turns: ["I've been using GolfNow, it's great"], expect: { flow: ["clarify", "faq"] } },
];

export const buildFallbackScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) return [];
  const allTemplates = [...fallbackTemplates, ...offTopicTemplates];
  return allTemplates.slice(0, count).map((t, i) => ({ ...t, id: `${t.id}-${i + 1}`, suite: "fallback" as const }));
};
