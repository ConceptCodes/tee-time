import type { RouterDecision } from "@tee-time/agent";
import { runStatusFollowup } from "@tee-time/agent";

export type ScenarioSuite = "booking" | "faq" | "fallback" | "updates";

export type ScenarioExpectation = {
  flow?: RouterDecision["flow"] | Array<RouterDecision["flow"]>;
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

const formatClub = (club: ClubInfo, includeLocation: boolean) => {
  if (includeLocation && club.locations.length > 0) {
    return `${club.name} ${club.locations[0]}`;
  }
  return club.name;
};

const withSuffix = (value: string, suffix: string) =>
  value.length > 0 ? `${value} ${suffix}` : suffix;

const bookingTemplates = [
  {
    key: "complete-basic",
    build: (club: ClubInfo, index: number) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-complete-basic-${index}`,
        name: "Complete booking with notes",
        turns: [
          `Book a tee time at ${clubText} tomorrow at 2pm for 1 player. Notes: none.`,
        ],
        expect: {
          flow: "booking-new",
          decisionTypes: ["review"],
        },
      };
    },
  },
  {
    key: "complete-guests",
    build: (club: ClubInfo, index: number) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-complete-guests-${index}`,
        name: "Complete booking with guests",
        turns: [
          `Need a tee time at ${clubText} next friday at 9am for 2 players. Guests: Alex, Sam. Notes: none.`,
        ],
        expect: {
          flow: "booking-new",
          decisionTypes: ["review"],
        },
      };
    },
  },
  {
    key: "missing-time",
    build: (club: ClubInfo, index: number) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-time-${index}`,
        name: "Missing time",
        turns: [`Book ${clubText} tomorrow for 2 players. Notes: none.`],
        expect: {
          flow: "booking-new",
          decisionTypes: ["ask"],
          promptIncludes: ["time"],
        },
      };
    },
  },
  {
    key: "missing-players",
    build: (club: ClubInfo, index: number) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-players-${index}`,
        name: "Missing players",
        turns: [
          `Book ${clubText} tomorrow at 2pm. Notes: none.`,
        ],
        expect: {
          flow: "booking-new",
          decisionTypes: ["ask"],
          promptIncludes: ["players"],
        },
      };
    },
  },
  {
    key: "missing-guests",
    build: (club: ClubInfo, index: number) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-guests-${index}`,
        name: "Missing guest names",
        turns: [
          `Book ${clubText} tomorrow at 2pm for 3 players. Notes: none.`,
        ],
        expect: {
          flow: "booking-new",
          decisionTypes: ["ask"],
          promptIncludes: ["guest"],
        },
      };
    },
  },
  {
    key: "missing-club",
    build: (_club: ClubInfo, index: number) => {
      return {
        id: `booking-missing-club-${index}`,
        name: "Missing club",
        turns: ["I want to book tomorrow at 2pm for 2 players. Notes: none."],
        expect: {
          flow: "booking-new",
          decisionTypes: ["ask"],
          promptIncludes: ["club"],
        },
      };
    },
  },
  {
    key: "invalid-club",
    build: (_club: ClubInfo, index: number) => {
      return {
        id: `booking-invalid-club-${index}`,
        name: "Invalid club",
        turns: [
          "Book a tee time at Moonlight Links tomorrow at 2pm for 1 player. Notes: none.",
        ],
        expect: {
          flow: "booking-new",
          decisionTypes: ["ask"],
          promptIncludes: ["club"],
        },
      };
    },
  },
  {
    key: "missing-location",
    build: (club: ClubInfo, index: number) => {
      if (club.locations.length <= 1) {
        return null;
      }
      return {
        id: `booking-missing-location-${index}`,
        name: "Missing location",
        turns: [
          `Book ${club.name} tomorrow at 2pm for 1 player. Notes: none.`,
        ],
        expect: {
          flow: "booking-new",
          decisionTypes: ["ask"],
          promptIncludes: ["location"],
        },
      };
    },
  },
];

const buildBookingScenarios = (clubs: ClubInfo[], count: number): EvalScenario[] => {
  if (count <= 0) {
    return [];
  }
  if (clubs.length === 0) {
    return [
      {
        id: "booking-skip",
        name: "Booking scenarios skipped",
        suite: "booking",
        skipReason: "No active clubs available",
      },
    ];
  }

  const scenarios: EvalScenario[] = [];
  const maxAttempts = count * bookingTemplates.length * 2;
  let attempts = 0;
  let index = 0;

  while (scenarios.length < count && attempts < maxAttempts) {
    const template = bookingTemplates[index % bookingTemplates.length];
    const club = clubs[index % clubs.length];
    const built = template.build(club, index + 1);
    if (built) {
      scenarios.push({
        id: built.id,
        name: built.name,
        suite: "booking",
        turns: built.turns,
        expect: built.expect,
      });
    }
    attempts += 1;
    index += 1;
  }

  if (scenarios.length === 0) {
    return [
      {
        id: "booking-skip",
        name: "Booking scenarios skipped",
        suite: "booking",
        skipReason: "No valid booking scenarios available",
      },
    ];
  }

  return scenarios.slice(0, count);
};

const buildFaqScenarios = (questions: string[], count: number): EvalScenario[] => {
  if (count <= 0) {
    return [];
  }
  if (questions.length === 0) {
    return [
      {
        id: "faq-skip",
        name: "FAQ scenarios skipped",
        suite: "faq",
        skipReason: "No active FAQ entries available",
      },
    ];
  }

  const scenarios: EvalScenario[] = [];
  for (let i = 0; i < count; i += 1) {
    const question = questions[i % questions.length];
    const suffix = i >= questions.length ? "please" : "";
    const prompt = suffix ? withSuffix(question, suffix) : question;
    scenarios.push({
      id: `faq-${i + 1}`,
      name: "FAQ query",
      suite: "faq",
      turns: [prompt],
      expect: {
        flow: "faq",
        decisionTypes: ["answer"],
      },
    });
  }
  return scenarios;
};

const buildFallbackScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) {
    return [];
  }
  const base: EvalScenario[] = [
    {
      id: "fallback-support-1",
      name: "Explicit support request",
      suite: "fallback",
      turns: ["I need to talk to a human agent."],
      expect: { flow: "support" },
    },
    {
      id: "fallback-support-2",
      name: "Support escalation",
      suite: "fallback",
      turns: ["Please connect me to staff."],
      expect: { flow: "support" },
    },
    {
      id: "fallback-clarify-1",
      name: "Gibberish input",
      suite: "fallback",
      turns: ["asdlkjasdkljasd"],
      expect: { flow: "clarify" },
    },
    {
      id: "fallback-clarify-2",
      name: "Vague request",
      suite: "fallback",
      turns: ["Help."],
      expect: { flow: ["clarify", "support"] },
    },
  ];

  const scenarios: EvalScenario[] = [];
  for (let i = 0; i < count; i += 1) {
    const baseScenario = base[i % base.length];
    scenarios.push({
      ...baseScenario,
      id: `${baseScenario.id}-${i + 1}`,
    });
  }
  return scenarios.slice(0, count);
};

const buildUpdateScenarios = (count: number): EvalScenario[] => {
  if (count <= 0) {
    return [];
  }
  const base = [
    {
      id: "update-confirmed",
      name: "Confirmed follow-up",
      run: async () => {
        const result = runStatusFollowup({
          status: "Confirmed",
          memberName: "Alex",
          preferredDate: "2025-01-10",
          preferredTime: "14:00",
        });
        if (!result.message.toLowerCase().includes("confirmed")) {
          return { status: "fail", details: "Missing confirmed text" };
        }
        return { status: "pass" };
      },
    },
    {
      id: "update-not-available",
      name: "Not available follow-up",
      run: async () => {
        const result = runStatusFollowup({
          status: "Not Available",
          memberName: "Alex",
          preferredDate: "2025-01-10",
          preferredTime: "14:00",
          alternateTimes: ["15:00", "16:00"],
        });
        if (!result.message.toLowerCase().includes("couldn't secure")) {
          return { status: "fail", details: "Missing not available text" };
        }
        return { status: "pass" };
      },
    },
    {
      id: "update-follow-up",
      name: "Follow-up required",
      run: async () => {
        const result = runStatusFollowup({
          status: "Follow-up required",
          memberName: "Alex",
          preferredDate: "2025-01-10",
          preferredTime: "14:00",
        });
        if (!result.message.toLowerCase().includes("need a little more info")) {
          return { status: "fail", details: "Missing follow-up text" };
        }
        return { status: "pass" };
      },
    },
  ];

  const scenarios: EvalScenario[] = [];
  for (let i = 0; i < count; i += 1) {
    const template = base[i % base.length];
    scenarios.push({
      id: `${template.id}-${i + 1}`,
      name: template.name,
      suite: "updates",
      run: template.run,
    });
  }
  return scenarios;
};

export const buildScenarios = (params: {
  clubs: ClubInfo[];
  faqQuestions: string[];
  counts: { booking: number; faq: number; fallback: number; updates: number };
}) => {
  const booking = buildBookingScenarios(params.clubs, params.counts.booking);
  const faq = buildFaqScenarios(params.faqQuestions, params.counts.faq);
  const fallback = buildFallbackScenarios(params.counts.fallback);
  const updates = buildUpdateScenarios(params.counts.updates);
  return { booking, faq, fallback, updates };
};
