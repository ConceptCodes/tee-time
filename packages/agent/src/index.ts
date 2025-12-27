export { createSyndicateAgent, DEFAULT_AGENT_INSTRUCTIONS } from "./agent";
export type { AgentOptions } from "./agent";

export type { RouterDecision, RouterInput } from "./workflows/router";
export { routeAgentMessage } from "./workflows/router";

export { runFaqFlow } from "./workflows/faq";
export type { FaqFlowDecision, FaqFlowInput } from "./workflows/faq";

export { runBookingStatusFlow } from "./workflows/booking-status";
export type {
  BookingStatusFlowDecision,
  BookingStatusFlowInput,
} from "./workflows/booking-status";

export { runBookingIntakeFlow } from "./workflows/booking-intake";
export type {
  BookingIntakeDecision,
  BookingIntakeInput,
  BookingIntakeState,
} from "./workflows/booking-intake";

export { runOnboardingFlow } from "./workflows/onboarding";
export type {
  OnboardingDecision,
  OnboardingInput,
  OnboardingState,
} from "./workflows/onboarding";

export { runCancelBookingFlow } from "./workflows/cancel-booking";
export type {
  CancelBookingDecision,
  CancelBookingInput,
  CancelBookingState,
} from "./workflows/cancel-booking";

export { runModifyBookingFlow } from "./workflows/modify-booking";
export type {
  ModifyBookingDecision,
  ModifyBookingInput,
  ModifyBookingState,
} from "./workflows/modify-booking";

export { runClubSelectionFlow } from "./workflows/club-selection";
export type {
  ClubSelectionDecision,
  ClubSelectionInput,
  ClubSelectionState,
} from "./workflows/club-selection";

export { runSupportHandoffFlow } from "./workflows/support-handoff";
export type {
  SupportHandoffDecision,
  SupportHandoffInput,
  SupportHandoffState,
} from "./workflows/support-handoff";

export { runStatusFollowup } from "./workflows/status-followups";
export type { StatusFollowupDecision, StatusFollowupInput } from "./workflows/status-followups";

export { runMemberPreferencesFlow } from "./workflows/member-preferences";
export type {
  MemberPreferencesDecision,
  MemberPreferencesInput,
  MemberPreferencesState,
} from "./workflows/member-preferences";
