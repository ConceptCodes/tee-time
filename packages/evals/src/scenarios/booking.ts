import type { ClubInfo, EvalScenario, ScenarioExpectation } from "./types";
import { formatClub } from "./types";

type BookingTemplate = {
  key: string;
  build: (club: ClubInfo, index: number) => {
    id: string;
    name: string;
    turns: string[];
    expect: ScenarioExpectation;
  } | null;
};

const bookingTemplates: BookingTemplate[] = [
  // === HAPPY PATH: Complete bookings ===
  {
    key: "complete-basic",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-complete-basic-${index}`,
        name: "Complete booking with notes",
        turns: [`Book a tee time at ${clubText} tomorrow at 2pm for 1 player. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["review"] },
      };
    },
  },
  {
    key: "complete-guests",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-complete-guests-${index}`,
        name: "Complete booking with guests",
        turns: [`Need a tee time at ${clubText} next friday at 9am for 2 players. Guests: Alex, Sam. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["review"] },
      };
    },
  },
  {
    key: "complete-time-window",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-complete-time-window-${index}`,
        name: "Complete booking with time window",
        turns: [`Book ${clubText} tomorrow between 2pm and 4pm for 1 player. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["review"] },
      };
    },
  },
  // === MISSING FIELD SCENARIOS ===
  {
    key: "missing-time",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-time-${index}`,
        name: "Missing time",
        turns: [`Book ${clubText} tomorrow for 2 players. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["time"] },
      };
    },
  },
  {
    key: "missing-players",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-players-${index}`,
        name: "Missing players",
        turns: [`Book ${clubText} tomorrow at 2pm. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["player"] },
      };
    },
  },
  {
    key: "missing-guests",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-guests-${index}`,
        name: "Missing guest names",
        turns: [`Book ${clubText} tomorrow at 2pm for 3 players. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["guest"] },
      };
    },
  },
  {
    key: "missing-club",
    build: (_club, index) => ({
      id: `booking-missing-club-${index}`,
      name: "Missing club",
      turns: ["I want to book tomorrow at 2pm for 2 players. Notes: none."],
      expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["club"] },
    }),
  },
  {
    key: "missing-date",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-missing-date-${index}`,
        name: "Missing date",
        turns: [`Book ${clubText} at 2pm for 1 player. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["date"] },
      };
    },
  },
  // === INVALID/EDGE CASES ===
  {
    key: "invalid-club",
    build: (_club, index) => ({
      id: `booking-invalid-club-${index}`,
      name: "Invalid club",
      turns: ["Book a tee time at Moonlight Links tomorrow at 2pm for 1 player. Notes: none."],
      expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["club"] },
    }),
  },
  {
    key: "missing-location",
    build: (club, index) => {
      if (club.locations.length <= 1) return null;
      return {
        id: `booking-missing-location-${index}`,
        name: "Missing location",
        turns: [`Book ${club.name} tomorrow at 2pm for 1 player. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["ask"], promptIncludes: ["location"] },
      };
    },
  },
  // === NATURAL LANGUAGE VARIATIONS ===
  {
    key: "informal-language",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-informal-${index}`,
        name: "Informal language",
        turns: [`yo can I get a tee time at ${clubText} tmrw around 2 for just me? no notes`],
        expect: { flow: "booking-new", decisionTypes: ["review", "ask"] },
      };
    },
  },
  {
    key: "polite-request",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-polite-${index}`,
        name: "Polite request",
        turns: [`Hi! I would like to book a tee time at ${clubText} for tomorrow afternoon around 2pm please. It will be just me. No special notes needed.`],
        expect: { flow: "booking-new", decisionTypes: ["review", "ask"] },
      };
    },
  },
  // === DATE/TIME VARIATIONS ===
  {
    key: "next-monday",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-next-monday-${index}`,
        name: "Next Monday booking",
        turns: [`Book ${clubText} next Monday at 10am for 1 player. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["review", "ask"] },
      };
    },
  },
  {
    key: "morning-time",
    build: (club, index) => {
      const includeLocation = club.locations.length > 1;
      const clubText = formatClub(club, includeLocation);
      return {
        id: `booking-morning-${index}`,
        name: "Morning time preference",
        turns: [`Book ${clubText} tomorrow morning for 1 player. Notes: none.`],
        expect: { flow: "booking-new", decisionTypes: ["review", "ask"] },
      };
    },
  },
];

export const buildBookingScenarios = (clubs: ClubInfo[], count: number): EvalScenario[] => {
  if (count <= 0) return [];
  if (clubs.length === 0) {
    return [{ id: "booking-skip", name: "Booking scenarios skipped", suite: "booking", skipReason: "No active clubs available" }];
  }

  const scenarios: EvalScenario[] = [];
  let index = 0;
  while (scenarios.length < count && index < count * 2) {
    const template = bookingTemplates[index % bookingTemplates.length];
    const club = clubs[index % clubs.length];
    const built = template.build(club, index + 1);
    if (built) {
      scenarios.push({ ...built, suite: "booking" });
    }
    index += 1;
  }
  return scenarios.slice(0, count);
};
