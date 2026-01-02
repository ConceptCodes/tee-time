import type { ClubInfo } from "./types";

export type UXFeatureScenario = {
  name: string;
  description: string;
  initialMessage: string;
  expectedFlow: string;
  turns: {
    message: string;
    expectedFlow: string;
    expectedContent?: string[];
  }[];
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
        expectedContent: ["topgolf", "next tuesday", "3pm"],
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
