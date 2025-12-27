import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@syndicate/database";
import { createBookingWithHistory, getBayAvailability } from "@syndicate/core";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { runClubSelectionFlow } from "./club-selection";

export type BookingIntakeInput = {
  message: string;
  memberId?: string;
  locale?: string;
  existingState?: Partial<BookingIntakeState>;
  defaults?: Partial<BookingIntakeState>;
  confirmed?: boolean;
  availability?: {
    locationFull?: boolean;
    suggestedTimes?: string[];
    availableBays?: Array<{ id: string; name: string }>;
  };
  submitBooking?: (payload: BookingIntakeState) => Promise<{
    bookingId: string;
    status: string;
  }>;
  db?: Database;
  getAvailability?: (params: {
    clubLocation?: string;
    preferredDate?: string;
    preferredTime?: string;
  }) => Promise<{
    locationFull?: boolean;
    suggestedTimes?: string[];
    availableBays?: Array<{ id: string; name: string }>;
  }>;
  suggestions?: {
    clubs?: string[];
    clubLocations?: string[];
    times?: string[];
    bays?: string[];
  };
};

export type BookingIntakeState = {
  memberId?: string;
  clubId?: string;
  clubLocationId?: string;
  preferredTimeEnd?: string;
  club?: string;
  clubLocation?: string;
  bayLabel?: string;
  bayId?: string;
  preferredDate?: string;
  preferredTime?: string;
  players?: number;
  guestNames?: string;
  notes?: string;
};

export type BookingIntakeDecision =
  | {
      type: "ask";
      prompt: string;
      nextState: BookingIntakeState;
    }
  | {
      type: "confirm-default";
      prompt: string;
      nextState: BookingIntakeState;
    }
  | {
      type: "review";
      summary: string;
      nextState: BookingIntakeState;
    }
  | {
      type: "ask-alternatives";
      prompt: string;
      nextState: BookingIntakeState;
    }
  | {
      type: "submit";
      payload: BookingIntakeState;
    }
  | {
      type: "submitted";
      bookingId: string;
      message: string;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const missingFields = (state: BookingIntakeState) => {
  const required = [
    ["club", "Which club would you like to book?"] as const,
    ["preferredDate", "What date would you like?"] as const,
    ["preferredTime", "What time (or time window) should we request?"] as const,
    ["players", "How many players (1-4)?"] as const,
  ];
  return required.find(([key]) => !state[key]);
};

const formatSummary = (state: BookingIntakeState) => {
  const lines = [
    `Club: ${state.club ?? "-"}`,
    `Location: ${state.clubLocation ?? "-"}`,
    `Bay: ${state.bayLabel ?? "-"}`,
    `Date: ${state.preferredDate ?? "-"}`,
    `Time: ${state.preferredTime ?? "-"}`,
    `Players: ${state.players ?? "-"}`,
    `Guests: ${state.guestNames ?? "-"}`,
    `Notes: ${state.notes ?? "-"}`,
  ];
  return `Please confirm these booking details:\n${lines.join("\n")}`;
};

const BookingIntakeParseSchema = z.object({
  club: z.string().optional(),
  clubLocation: z.string().optional(),
  bay: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  players: z.number().int().optional(),
  guestNames: z.string().optional(),
  notes: z.string().optional(),
});

const buildDefaultPrompt = (field: keyof BookingIntakeState, value: string) => {
  switch (field) {
    case "club":
      return `I can default the club to "${value}". Would you like to use that?`;
    case "clubLocation":
      return `I can default the location to "${value}". Want to use that?`;
    case "preferredDate":
      return `I can use "${value}" as the date. Does that work?`;
    case "preferredTime":
      return `I can use "${value}" as the preferred time. Does that work?`;
    case "bayLabel":
      return `I can use "${value}" as the bay. Does that work?`;
    case "players":
      return `I can use ${value} players. Does that work?`;
    default:
      return `I can use "${value}". Does that work?`;
  }
};

const buildAskPrompt = (
  field: keyof BookingIntakeState,
  basePrompt: string,
  suggestions?: BookingIntakeInput["suggestions"]
) => {
  if (field === "club" && suggestions?.clubs?.length) {
    return `${basePrompt} Options: ${suggestions.clubs.join(", ")}.`;
  }
  if (field === "clubLocation" && suggestions?.clubLocations?.length) {
    return `${basePrompt} Options: ${suggestions.clubLocations.join(", ")}.`;
  }
  if (field === "preferredTime" && suggestions?.times?.length) {
    return `${basePrompt} Options: ${suggestions.times.join(", ")}.`;
  }
  if (field === "bayLabel" && suggestions?.bays?.length) {
    return `${basePrompt} Options: ${suggestions.bays.join(", ")}.`;
  }
  return basePrompt;
};

const buildAlternativePrompt = (suggestedTimes?: string[]) => {
  if (suggestedTimes?.length) {
    return `That location is fully booked. Do any of these times work instead: ${suggestedTimes.join(
      ", "
    )}? You can also share another time window.`;
  }
  return "That location is fully booked. What alternate time window works for you?";
};

const applyParsedFields = (
  state: BookingIntakeState,
  parsed: Partial<BookingIntakeState>
) => ({
  ...state,
  ...Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined)
  ),
});

export const runBookingIntakeFlow = async (
  input: BookingIntakeInput
): Promise<BookingIntakeDecision> => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt:
        "I can help book a tee time. Tell me the club, date, and time you want.",
    };
  }

  const state: BookingIntakeState = {
    ...(input.defaults ?? {}),
    ...(input.existingState ?? {}),
  };
  if (input.memberId) {
    state.memberId = input.memberId;
  }

  try {
    const openrouter = getOpenRouterClient();
    const modelId = resolveModelId();
    const result = await generateObject({
      model: openrouter.chat(modelId),
      schema: BookingIntakeParseSchema,
      system:
        "Extract booking details from the message. Use the user's wording when possible.",
      prompt:
        "Extract any of these fields if present: club, club location, bay, preferred date, preferred time or time window, number of players (1-4), guest names, notes. " +
        "If a field is not present, omit it.",
      input: { message },
    });

    Object.assign(
      state,
      applyParsedFields(state, {
        ...result.object,
        bayLabel: result.object.bay,
      })
    );
  } catch {
    // If parsing fails, continue with existing state.
  }

  if (input.suggestions?.clubs?.length) {
    const clubSelection = runClubSelectionFlow({
      message,
      clubs: input.suggestions.clubs,
      locations: state.club
        ? [
            {
              club: state.club,
              locations: input.suggestions.clubLocations ?? [],
            },
          ]
        : undefined,
      existingState: {
        club: state.club,
        clubLocation: state.clubLocation,
      },
    });

    if (clubSelection.type === "ask-club") {
      return {
        type: "ask",
        prompt: clubSelection.prompt,
        nextState: state,
      };
    }

    if (clubSelection.type === "ask-location") {
      return {
        type: "ask",
        prompt: clubSelection.prompt,
        nextState: state,
      };
    }

    if (clubSelection.type === "select") {
      state.club = clubSelection.selection.club;
      state.clubLocation =
        clubSelection.selection.clubLocation ?? state.clubLocation;
    }
  }


  if (!input.availability && input.getAvailability && state.clubLocationId) {
    try {
      input.availability = await input.getAvailability({
        clubLocation: state.clubLocationId,
        preferredDate: state.preferredDate,
        preferredTime: state.preferredTime,
      });
    } catch {
      // Ignore availability errors; proceed with prompts.
    }
  }

  if (!input.availability && input.db && state.clubLocationId) {
    try {
      const availability = await getBayAvailability(
        input.db,
        state.clubLocationId
      );
      input.availability = availability;
    } catch {
      // Ignore availability errors; proceed with prompts.
    }
  }

  if (!input.availability && input.getAvailability && state.clubLocation) {
    try {
      input.availability = await input.getAvailability({
        clubLocation: state.clubLocation,
        preferredDate: state.preferredDate,
        preferredTime: state.preferredTime,
      });
    } catch {
      // Ignore availability errors; proceed with prompts.
    }
  }

  if (input.availability?.locationFull) {
    return {
      type: "ask-alternatives",
      prompt: buildAlternativePrompt(
        input.availability.suggestedTimes ?? input.suggestions?.times
      ),
      nextState: state,
    };
  }

  const availableBayNames =
    input.availability?.availableBays?.map((bay) => bay.name) ??
    input.suggestions?.bays ??
    [];

  if (state.bayLabel && availableBayNames.length) {
    const normalized = state.bayLabel.trim().toLowerCase();
    const availableBays =
      input.availability?.availableBays ??
      availableBayNames.map((name) => ({ id: name, name }));
    const match = availableBays.find(
      (bay) => bay.name.trim().toLowerCase() === normalized
    );
    if (match) {
      state.bayId = match.id;
      state.bayLabel = match.name;
    }
    if (!match) {
      return {
        type: "ask-alternatives",
        prompt: buildAlternativePrompt(
          input.availability?.suggestedTimes ?? input.suggestions?.times
        ),
        nextState: state,
      };
    }
  }

  if (availableBayNames.length && !state.bayLabel) {
    const defaultBay = input.defaults?.bayLabel;
    if (defaultBay) {
      return {
        type: "confirm-default",
        prompt: buildDefaultPrompt("bayLabel", String(defaultBay)),
        nextState: state,
      };
    }
    return {
      type: "ask",
      prompt: buildAskPrompt(
        "bayLabel",
        "Which bay should we use?",
        { ...input.suggestions, bays: availableBayNames }
      ),
      nextState: state,
    };
  }

  const missing = missingFields(state);
  if (missing) {
    const field = missing[0];
    const defaultValue = input.defaults?.[field];
    if (defaultValue !== undefined) {
      return {
        type: "confirm-default",
        prompt: buildDefaultPrompt(field, String(defaultValue)),
        nextState: state,
      };
    }
    return {
      type: "ask",
      prompt: buildAskPrompt(field, missing[1], input.suggestions),
      nextState: state,
    };
  }

  if (input.confirmed) {
    const submit =
      input.submitBooking ??
      (input.db
        ? async (payload: BookingIntakeState) => {
            if (!payload.memberId || !payload.clubId) {
              throw new Error("booking_intake_missing_ids");
            }
            const booking = await createBookingWithHistory(input.db as Database, {
              memberId: payload.memberId,
              clubId: payload.clubId,
              clubLocationId: payload.clubLocationId ?? null,
              bayId: payload.bayId ?? null,
              preferredDate: new Date(payload.preferredDate as string),
              preferredTimeStart: payload.preferredTime as string,
              preferredTimeEnd: payload.preferredTimeEnd ?? null,
              numberOfPlayers: payload.players as number,
              guestNames: payload.guestNames ?? "",
              notes: payload.notes ?? "",
              notify: true,
            });
            return { bookingId: booking.id, status: booking.status };
          }
        : undefined);
    if (submit) {
      const result = await submit(state);
      return {
        type: "submitted",
        bookingId: result.bookingId,
        message: `Your booking request is ${result.status}.`,
      };
    }
    return { type: "submit", payload: state };
  }

  return {
    type: "review",
    summary: formatSummary(state),
    nextState: state,
  };
};
