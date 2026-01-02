// Re-export types
export type {
  ScenarioSuite,
  ScenarioExpectation,
  ScenarioResult,
  EvalScenario,
  ClubInfo,
  FlowType,
} from "./types";

export { formatClub, withSuffix } from "./types";

// Re-export scenario builders
export { buildBookingScenarios } from "./booking";
export { buildBookingStatusScenarios } from "./booking-status";
export { buildCancelBookingScenarios } from "./cancel";
export { buildModifyBookingScenarios } from "./modify";
export { buildOnboardingScenarios } from "./onboarding";
export { buildMultiTurnScenarios } from "./multi-turn";
export { buildFaqScenarios } from "./faq";
export { buildFallbackScenarios } from "./fallback";
export { buildEdgeCaseScenarios } from "./edge-cases";
export { buildUpdateScenarios } from "./updates";
export {
  statePersistenceScenarios,
  multiBookingScenarios,
  courseCorrectionScenarios,
} from "./ux-features";

// Import builders for buildScenarios
import type { ClubInfo } from "./types";
import { buildBookingScenarios } from "./booking";
import { buildBookingStatusScenarios } from "./booking-status";
import { buildCancelBookingScenarios } from "./cancel";
import { buildModifyBookingScenarios } from "./modify";
import { buildOnboardingScenarios } from "./onboarding";
import { buildMultiTurnScenarios } from "./multi-turn";
import { buildFaqScenarios } from "./faq";
import { buildFallbackScenarios } from "./fallback";
import { buildEdgeCaseScenarios } from "./edge-cases";
import { buildUpdateScenarios } from "./updates";
import {
  statePersistenceScenarios,
  multiBookingScenarios,
  courseCorrectionScenarios,
} from "./ux-features";

/**
 * Build all scenarios based on configuration counts.
 */
export const buildScenarios = (params: {
  clubs: ClubInfo[];
  faqQuestions: string[];
  counts: {
    booking: number;
    "booking-status": number;
    cancel: number;
    modify: number;
    onboarding: number;
    "multi-turn": number;
    faq: number;
    fallback: number;
    "edge-cases": number;
    updates: number;
  };
}) => {
  return {
    booking: buildBookingScenarios(params.clubs, params.counts.booking),
    "booking-status": buildBookingStatusScenarios(params.counts["booking-status"]),
    cancel: buildCancelBookingScenarios(params.counts.cancel),
    modify: buildModifyBookingScenarios(params.counts.modify),
    onboarding: buildOnboardingScenarios(params.counts.onboarding),
    "multi-turn": buildMultiTurnScenarios(params.clubs, params.counts["multi-turn"]),
    faq: buildFaqScenarios(params.faqQuestions, params.counts.faq),
    fallback: buildFallbackScenarios(params.counts.fallback),
    "edge-cases": buildEdgeCaseScenarios(params.clubs, params.counts["edge-cases"]),
    updates: buildUpdateScenarios(params.counts.updates),
  };
};
