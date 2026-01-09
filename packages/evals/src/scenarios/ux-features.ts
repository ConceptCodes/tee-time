import type { EvalScenario, FlowType } from "./types";
import {
  getDb,
  createClubRepository,
  createClubLocationRepository,
  createClubLocationBayRepository,
  createBookingStatusHistoryRepository,
} from "@tee-time/database";
import {
  createMemberProfile,
  createBookingWithHistory,
  clearBookingState,
} from "@tee-time/core";

export type UXFeatureScenario = {
  name: string;
  description: string;
  initialMessage: string;
  expectedFlow: FlowType;
  turns: {
    message: string;
    expectedFlow: FlowType;
    expectedContent?: string[];
  }[];
};

const toEvalScenario = (
  suite: EvalScenario["suite"],
  scenario: UXFeatureScenario
): EvalScenario => {
  const turns = [scenario.initialMessage, ...scenario.turns.map((turn) => turn.message)];
  const lastTurn = scenario.turns[scenario.turns.length - 1];
  return {
    id: scenario.name,
    name: scenario.description,
    suite,
    turns,
    expect: {
      flow: lastTurn?.expectedFlow ?? scenario.expectedFlow,
      promptIncludes: lastTurn?.expectedContent,
    },
  };
};

export const statePersistenceScenarios: UXFeatureScenario[] = [
  {
    name: "state-persistence-1",
    description: "User switches from booking to status and back, retains collected info",
    initialMessage: "Book at Drive Shack for tomorrow at 4pm for 2 players",
    expectedFlow: "booking-new",
    turns: [
      {
        message: "Actually, never mind. I want to check my bookings first",
        expectedFlow: "booking-status",
      },
      {
        message: "Let's continue booking for Drive Shack at 4pm",
        expectedFlow: "booking-new",
        expectedContent: ["drive shack", "4pm"],
      },
    ],
  },
  {
    name: "state-persistence-2",
    description: "User starts booking, asks FAQ, returns to booking with club retained",
    initialMessage: "Book for next Tuesday at 3pm",
    expectedFlow: "booking-new",
    turns: [
      {
        message: "What clubs do you have?",
        expectedFlow: "faq",
      },
      {
        message: "Ok, Topgolf for 3pm next Tuesday",
        expectedFlow: "booking-new",
        expectedContent: ["topgolf", "3"],  // Just check for "3" (matches 3pm, 3:00, etc) and "topgolf"
      },
    ],
  },
];

export const multiBookingScenarios: UXFeatureScenario[] = [
  {
    name: "multi-booking-1",
    description: "User with multiple bookings sees all listed",
    initialMessage: "What are my upcoming bookings?",
    expectedFlow: "booking-status",
    turns: [
      {
        message: "Can I see the details for the second one?",
        expectedFlow: "booking-status",
      },
    ],
  },
  {
    name: "multi-booking-2",
    description: "User selects specific booking to modify",
    initialMessage: "Show me my bookings",
    expectedFlow: "booking-status",
    turns: [
      {
        message: "Change the first one to 5pm",
        expectedFlow: "modify-booking",
      },
    ],
  },
];

export const courseCorrectionScenarios: UXFeatureScenario[] = [
  {
    name: "course-correction-1",
    description: "User changes mind mid-booking with 'wait'",
    initialMessage: "Book at Topgolf for tomorrow at 2pm",
    expectedFlow: "booking-new",
    turns: [
      {
        message: "Wait, actually I want Drive Shack instead",
        expectedFlow: "booking-new",
        expectedContent: ["drive shack"],
      },
    ],
  },
  {
    name: "course-correction-2",
    description: "User corrects time selection mid-booking",
    initialMessage: "Book at Puttery for Friday at 3pm",
    expectedFlow: "booking-new",
    turns: [
      {
        message: "Actually, make it 5pm instead",
        expectedFlow: "booking-new",
        expectedContent: ["5pm"],
      },
    ],
  },
];

export const buildStatePersistenceScenarios = (count: number): EvalScenario[] =>
  statePersistenceScenarios
    .slice(0, count)
    .map((scenario) => toEvalScenario("state-persistence", scenario));

export const buildMultiBookingScenarios = (count: number): EvalScenario[] =>
  multiBookingScenarios
    .slice(0, count)
    .map((scenario) => ({
      ...toEvalScenario("multi-booking", scenario),
      run: async ({ now: Date }) => {
        const db = getDb();

        const clubs = await createClubRepository(db).listActive();
        if (clubs.length === 0) {
          return { status: "skip", details: "No active clubs available" };
        }

        const club = clubs.find(c => c.name === "Test Club");
        if (!club) {
          return { status: "skip", details: "Test Club fixture not found" };
        }

        const locationRepo = createClubLocationRepository(db);
        const location = await locationRepo.listActiveByClubId(club.id);
        if (!location || location.length === 0) {
          return { status: "fail", details: "No active locations found for test club" };
        }

        const bayRepo = createClubLocationBayRepository(db);
        const availableBays = await bayRepo.listByLocationId(location[0].id, {
          status: "available",
        });

        if (availableBays.length === 0) {
          return { status: "fail", details: "No available bays for test location" };
        }

        const bookingCount = Math.min(2, availableBays.length);
        for (let i = 0; i < bookingCount; i++) {
          const bay = availableBays[i];
          const bookingDate = new Date(now);
          bookingDate.setDate(now.getDate() + (i * 7) + 1);

          await createBookingWithHistory(db, {
            memberId: member.id,
            clubId: club.id,
            clubLocationId: location[0].id,
            bayId: bay.id,
            preferredDate: bookingDate,
            preferredTimeStart: "14:00",
            preferredTimeEnd: null,
            numberOfPlayers: 2,
            guestNames: "",
            notes: `Test booking ${i + 1}`,
            notify: false,
          });
        }

        await clearBookingState(db, member.id);
        return { status: "pass" };
      },
    }));

export const buildCourseCorrectionScenarios = (count: number): EvalScenario[] =>
  courseCorrectionScenarios
    .slice(0, count)
    .map((scenario) => toEvalScenario("course-correction", scenario));
