import {
  createClubLocationRepository,
  createClubRepository,
  createFaqRepository,
  getDb,
} from "@tee-time/database";
import {
  clearBookingState,
  createMemberProfile,
} from "@tee-time/core";
import {
  routeAgentMessage,
  type RouterDecision,
} from "@tee-time/agent";
import {
  buildScenarios,
  type ClubInfo,
  type EvalScenario,
  type ScenarioSuite,
} from "./scenarios";

export type EvalConfig = {
  suites: ScenarioSuite[];
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
  seed: number;
  verbose: boolean;
  allowFaqEscalation: boolean;
  notify: boolean;
  captureTranscripts: boolean;
  summaryOnly: boolean;
};

export type EvalScenarioReport = {
  id: string;
  name: string;
  suite: ScenarioSuite;
  status: "pass" | "fail" | "skip";
  durationMs: number;
  details?: string;
  transcript?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type EvalSuiteReport = {
  suite: ScenarioSuite;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  scenarios: EvalScenarioReport[];
};

export type EvalReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  suites: EvalSuiteReport[];
  totals: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
};

const mulberry32 = (seed: number) => {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], seed: number) => {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const toDecisionInfo = (decision: RouterDecision) => {
  if (decision.flow === "booking-new") {
    const d = decision.decision;
    return {
      flow: decision.flow,
      type: d.type,
      text: d.type === "review" ? d.summary : d.prompt ?? d.message,
    };
  }
  if (decision.flow === "booking-status") {
    const d = decision.decision;
    return {
      flow: decision.flow,
      type: d.type,
      text: d.message ?? d.prompt,
    };
  }
  if (decision.flow === "cancel-booking") {
    const d = decision.decision;
    return {
      flow: decision.flow,
      type: d.type,
      text: d.message ?? d.prompt,
    };
  }
  if (decision.flow === "modify-booking") {
    const d = decision.decision;
    return {
      flow: decision.flow,
      type: d.type,
      text: d.prompt,
    };
  }
  if (decision.flow === "faq") {
    const d = decision.decision;
    return {
      flow: decision.flow,
      type: d.type,
      text: d.answer ?? d.prompt,
    };
  }
  if (decision.flow === "clarify") {
    return { flow: decision.flow, type: "clarify", text: decision.prompt };
  }
  return { flow: decision.flow, type: decision.flow, text: undefined };
};

const decisionToResponse = (decision: RouterDecision) => {
  const info = toDecisionInfo(decision);
  return info.text ?? "";
};

const matchesExpectation = (
  decision: RouterDecision,
  expectation: EvalScenario["expect"],
  allowFaqEscalation: boolean
) => {
  if (!expectation) {
    return { status: "pass" as const };
  }
  const info = toDecisionInfo(decision);
  const flows = Array.isArray(expectation.flow)
    ? expectation.flow
    : expectation.flow
    ? [expectation.flow]
    : [];
  if (flows.length > 0 && !flows.includes(info.flow)) {
    return {
      status: "fail" as const,
      details: `Expected flow ${flows.join("/")}, got ${info.flow}`,
    };
  }
  if (expectation.decisionTypes?.length) {
    const allowed = expectation.decisionTypes;
    const isFaqEscalation =
      info.flow === "faq" && info.type === "escalate" && allowFaqEscalation;
    if (!allowed.includes(info.type ?? "") && !isFaqEscalation) {
      return {
        status: "fail" as const,
        details: `Expected type ${allowed.join("/")}, got ${info.type ?? "none"}`,
      };
    }
  }
  if (expectation.promptIncludes?.length) {
    const text = (info.text ?? "").toLowerCase();
    for (const fragment of expectation.promptIncludes) {
      if (!text.includes(fragment.toLowerCase())) {
        return {
          status: "fail" as const,
          details: `Missing prompt text: ${fragment}`,
        };
      }
    }
  }
  return { status: "pass" as const };
};

const collectClubInfo = async () => {
  const db = getDb();
  const clubRepo = createClubRepository(db);
  const locationRepo = createClubLocationRepository(db);
  const clubs = await clubRepo.listActive();
  const results: ClubInfo[] = [];
  for (const club of clubs) {
    const locations = await locationRepo.listActiveByClubId(club.id);
    results.push({
      id: club.id,
      name: club.name,
      locations: locations.map((location) => location.name),
    });
  }
  return results;
};

const collectFaqQuestions = async (limit: number) => {
  const db = getDb();
  const faqRepo = createFaqRepository(db);
  const entries = await faqRepo.listActive({ limit });
  return entries.map((entry) => entry.question).filter(Boolean);
};

const disableNotifications = () => {
  process.env.BOOKING_SLACK_UPDATES_CHANNEL = "";
  process.env.BOOKING_SLACK_USERNAMES = "";
  process.env.SUPPORT_SLACK_UPDATES_CHANNEL = "";
  process.env.SUPPORT_SLACK_USERNAMES = "";
};

const createEvalMember = async (label: string) => {
  const db = getDb();
  const now = new Date();
  const phoneNumber = `+1555${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`;
  const member = await createMemberProfile(db, {
    phoneNumber,
    name: `Eval ${label}`,
    timezone: "America/Chicago",
    favoriteLocationLabel: "Eval",
    preferredLocationLabel: undefined,
    preferredTimeOfDay: undefined,
    preferredBayLabel: undefined,
    onboardingCompletedAt: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return member;
};

const runAgentScenario = async (
  scenario: EvalScenario,
  config: EvalConfig
): Promise<EvalScenarioReport> => {
  const start = Date.now();
  if (scenario.skipReason) {
    return {
      id: scenario.id,
      name: scenario.name,
      suite: scenario.suite,
      status: "skip",
      durationMs: 0,
      details: scenario.skipReason,
    };
  }
  if (!scenario.turns || scenario.turns.length === 0) {
    return {
      id: scenario.id,
      name: scenario.name,
      suite: scenario.suite,
      status: "skip",
      durationMs: 0,
      details: "No turns provided",
    };
  }

  const db = getDb();
  const isOnboarding = scenario.suite === "onboarding";
  const member = isOnboarding ? null : await createEvalMember(scenario.id);
  if (member) {
    await clearBookingState(db, member.id);
  }
  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  let lastDecision: RouterDecision | null = null;

  for (const turn of scenario.turns) {
    lastDecision = await routeAgentMessage({
      message: turn,
      memberId: member?.id,
      memberExists: isOnboarding ? false : true,
      db,
      conversationHistory,
    });
    const responseText = decisionToResponse(lastDecision);
    conversationHistory.push({ role: "user", content: turn });
    conversationHistory.push({ role: "assistant", content: responseText });
  }

  if (!lastDecision) {
    return {
      id: scenario.id,
      name: scenario.name,
      suite: scenario.suite,
      status: "fail",
      durationMs: Date.now() - start,
      details: "No decision returned",
    };
  }

  const evaluation = matchesExpectation(
    lastDecision,
    scenario.expect,
    config.allowFaqEscalation
  );

  if (member) {
    await clearBookingState(db, member.id);
  }
  return {
    id: scenario.id,
    name: scenario.name,
    suite: scenario.suite,
    status: evaluation.status,
    durationMs: Date.now() - start,
    details: evaluation.details,
    transcript: config.captureTranscripts ? conversationHistory : undefined,
  };
};

const runScenario = async (
  scenario: EvalScenario,
  config: EvalConfig
): Promise<EvalScenarioReport> => {
  const start = Date.now();
  try {
    if (scenario.run) {
      if (scenario.skipReason) {
        return {
          id: scenario.id,
          name: scenario.name,
          suite: scenario.suite,
          status: "skip",
          durationMs: 0,
          details: scenario.skipReason,
        };
      }
      const result = await scenario.run({ now: new Date() });
      return {
        id: scenario.id,
        name: scenario.name,
        suite: scenario.suite,
        status: result.status,
        durationMs: Date.now() - start,
        details: result.details,
      };
    }
    return await runAgentScenario(scenario, config);
  } catch (error) {
    return {
      id: scenario.id,
      name: scenario.name,
      suite: scenario.suite,
      status: "fail",
      durationMs: Date.now() - start,
      details: (error as Error).message ?? "scenario_failed",
    };
  }
};

const summarizeSuite = (suite: ScenarioSuite, scenarios: EvalScenarioReport[]) => {
  const passed = scenarios.filter((s) => s.status === "pass").length;
  const failed = scenarios.filter((s) => s.status === "fail").length;
  const skipped = scenarios.filter((s) => s.status === "skip").length;
  return {
    suite,
    passed,
    failed,
    skipped,
    total: scenarios.length,
    scenarios,
  };
};

export const runEvals = async (config: EvalConfig): Promise<EvalReport> => {
  if (!config.notify) {
    disableNotifications();
  }

  const startedAt = Date.now();
  const clubs = await collectClubInfo();
  const faqQuestions = await collectFaqQuestions(config.counts.faq);

  const scenariosBySuite = buildScenarios({
    clubs,
    faqQuestions,
    counts: config.counts,
  });

  const allSuites: Array<{ suite: ScenarioSuite; scenarios: EvalScenario[] }> = [
    { suite: "booking", scenarios: scenariosBySuite.booking },
    { suite: "booking-status", scenarios: scenariosBySuite["booking-status"] },
    { suite: "cancel", scenarios: scenariosBySuite.cancel },
    { suite: "modify", scenarios: scenariosBySuite.modify },
    { suite: "onboarding", scenarios: scenariosBySuite.onboarding },
    { suite: "multi-turn", scenarios: scenariosBySuite["multi-turn"] },
    { suite: "faq", scenarios: scenariosBySuite.faq },
    { suite: "fallback", scenarios: scenariosBySuite.fallback },
    { suite: "edge-cases", scenarios: scenariosBySuite["edge-cases"] },
    { suite: "updates", scenarios: scenariosBySuite.updates },
  ];

  const filteredSuites = allSuites.filter((suite) =>
    config.suites.includes(suite.suite)
  );

  const reports: EvalSuiteReport[] = [];
  for (const suite of filteredSuites) {
    const shuffled = shuffle(suite.scenarios, config.seed + suite.suite.length);
    const results: EvalScenarioReport[] = [];
    const suiteTotal = shuffled.length;
    let index = 0;
    for (const scenario of shuffled) {
      index += 1;
      const prefix = `TEST [${suite.suite} ${index}/${suiteTotal}]`;
      if (!config.summaryOnly) {
        console.log(`${prefix} ${scenario.name}`);
      }
      const result = await runScenario(scenario, config);
      const statusLabel =
        result.status === "pass"
          ? "[PASS]"
          : result.status === "skip"
          ? "[SKIP]"
          : "[FAIL]";
      const detail = result.details ? ` - ${result.details}` : "";
      if (!config.summaryOnly) {
        console.log(`${statusLabel} ${scenario.id}${detail}`);
      }
      results.push(result);
    }
    reports.push(summarizeSuite(suite.suite, results));
  }

  const totals = reports.reduce(
    (acc, suite) => ({
      passed: acc.passed + suite.passed,
      failed: acc.failed + suite.failed,
      skipped: acc.skipped + suite.skipped,
      total: acc.total + suite.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 }
  );

  const finishedAt = Date.now();
  return {
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    suites: reports,
    totals,
  };
};
