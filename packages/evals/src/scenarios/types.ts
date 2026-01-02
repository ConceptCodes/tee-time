import type { RouterDecision } from "@tee-time/agent";

export type ScenarioSuite =
  | "booking"
  | "booking-status"
  | "cancel"
  | "modify"
  | "onboarding"
  | "multi-turn"
  | "faq"
  | "fallback"
  | "edge-cases"
  | "updates"
  | "state-persistence"
  | "multi-booking"
  | "course-correction";

export type FlowType = RouterDecision["flow"];

export type ScenarioExpectation = {
  flow?: FlowType | FlowType[];
  decisionTypes?: string[];
  promptIncludes?: string[];
};

export type ScenarioResult = {
  status: "pass" | "fail" | "skip";
  details?: string;
};

export type EvalScenario = {
  id: string;
  name: string;
  suite: ScenarioSuite;
  turns?: string[];
  expect?: ScenarioExpectation;
  run?: (params: { now: Date }) => Promise<ScenarioResult>;
  skipReason?: string;
};

export type ClubInfo = {
  id: string;
  name: string;
  locations: string[];
};

export const formatClub = (club: ClubInfo, includeLocation: boolean): string => {
  if (includeLocation && club.locations.length > 0) {
    return `${club.name} ${club.locations[0]}`;
  }
  return club.name;
};

export const withSuffix = (value: string, suffix: string): string =>
  value.length > 0 ? `${value} ${suffix}` : suffix;
