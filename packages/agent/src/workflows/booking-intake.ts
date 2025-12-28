import { generateObject } from "ai";
import { z } from "zod";
import {
  createClubLocationRepository,
  createClubRepository,
  type Database,
} from "@tee-time/database";
import {
  clearBookingState,
  createBookingWithHistory,
  getBayAvailability,
  getBookingState,
  getMaxPlayers,
  normalizePlayers,
  parsePreferredDate,
  parsePreferredTimeWindow,
  unwrapFlowState,
  wrapFlowState,
  saveBookingState,
  isBookingInPastError,
  isBookingTooSoonError,
} from "@tee-time/core";
import { getOpenRouterClient, resolveModelId } from "../provider";
import { runClubSelectionFlow } from "./club-selection";
import { isConfirmationMessage, normalizeMatchValue, debugLog } from "../utils";

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
    bookingReference?: string | null;
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
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
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
  pendingDefaultField?: BookingIntakeField;
};

export type BookingIntakeField =
  | "club"
  | "clubLocation"
  | "bayLabel"
  | "preferredDate"
  | "preferredTime"
  | "players"
  | "guestNames"
  | "notes";

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

const formatTimeWindow = (state: BookingIntakeState) => {
  if (state.preferredTimeEnd) {
    return `${state.preferredTime ?? "-"} - ${state.preferredTimeEnd}`;
  }
  return state.preferredTime ?? "-";
};

const resolveClubByName = async (
  db: Database,
  name: string,
  clubs?: Array<{ id: string; name: string }>
) => {
  const repo = createClubRepository(db);
  const allClubs = clubs ?? (await repo.listActive());
  const normalized = normalizeMatchValue(name);
  return (
    allClubs.find(
      (club) => normalizeMatchValue(club.name) === normalized
    ) ?? null
  );
};

const resolveClubLocationByName = async (
  db: Database,
  clubId: string,
  name: string
) => {
  const repo = createClubLocationRepository(db);
  const locations = await repo.listActiveByClubId(clubId);
  const normalized = normalizeMatchValue(name);
  return (
    locations.find(
      (location) => normalizeMatchValue(location.name) === normalized
    ) ?? null
  );
};

const missingFields = (state: BookingIntakeState) => {
  const missing = [];
  
  if (!state.club) missing.push(["club", "Which club would you like to book?"] as const);
  if (!state.preferredDate) missing.push(["preferredDate", "What date would you like to book? (e.g., Today, Tomorrow, or specific date)"] as const);
  if (!state.preferredTime) missing.push(["preferredTime", "What tee time would you prefer? (e.g., 2pm, or a window like 2-4pm)"] as const);
  if (state.players === undefined) missing.push(["players", `How many players will be joining? (Max ${getMaxPlayers()})`] as const);

  // Only ask for guest names if there are multiple players
  if (state.players && state.players > 1 && !state.guestNames) {
    missing.push(["guestNames", "What are the names of the other guests?"] as const);
  }

  // Always ask for notes
  if (state.notes === undefined) {
    missing.push(["notes", "Any specific notes or requests for this booking? (or say 'none')"] as const);
  }

  return missing[0];
};

const formatSummary = (state: BookingIntakeState) => {
  const lines = [
    `⛳ Club: ${state.club ?? "-"} ${state.clubLocation ? `(${state.clubLocation})` : ""}`,
    state.bayLabel ? `🎯 Bay: ${state.bayLabel}` : null,
    `📅 Date: ${state.preferredDate ?? "-"}`,
    `🕒 Time: ${formatTimeWindow(state)}`,
    `👥 Players: ${state.players ?? "-"}`,
  ];

  if (
    state.players &&
    state.players > 1 &&
    state.guestNames &&
    state.guestNames !== "None"
  ) {
    lines.push(`👤 Guests: ${state.guestNames}`);
  }

  if (state.notes && state.notes !== "None") {
    lines.push(`📝 Notes: ${state.notes}`);
  }

  const validLines = lines.filter((l): l is string => Boolean(l));
  return `Please confirm these booking details:\n\n${validLines.join("\n")}`;
};

const BookingIntakeParseSchema = z.object({
  club: z.string().nullable(),
  clubLocation: z.string().nullable(),
  bay: z.string().nullable(),
  preferredDate: z.string().nullable(),
  preferredTime: z.string().nullable(),
  players: z.coerce.number().int().nullable(),
  guestNames: z.string().nullable(),
  notes: z.string().nullable(),
});

const BookingValidationSchema = z.object({
  players: z.number().nullable(),
  playersValid: z.boolean(),
  date: z.string().nullable(),
  dateValid: z.boolean(),
  time: z.string().nullable(),
  timeValid: z.boolean(),
  issues: z.array(z.string()),
});

const buildDefaultPrompt = (field: BookingIntakeField, value: string) => {
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
    case "guestNames":
      return `I can list guests as: "${value}". Is that correct?`;
    case "notes":
      return `I can include this note: "${value}". Is that correct?`;
    default:
      return `I can use "${value}". Does that work?`;
  }
};

const buildAskPrompt = (
  field: BookingIntakeField,
  basePrompt: string,
  suggestions?: BookingIntakeInput["suggestions"]
) => {
  if (field === "club" && suggestions?.clubs?.length) {
    return `${basePrompt}\nOptions:\n- ${suggestions.clubs.join("\n- ")}`;
  }
  if (field === "clubLocation" && suggestions?.clubLocations?.length) {
    return `${basePrompt}\nAvailable locations:\n- ${suggestions.clubLocations.join("\n- ")}`;
  }
  if (field === "preferredTime" && suggestions?.times?.length) {
    return `${basePrompt}\nSuggested times:\n- ${suggestions.times.join("\n- ")}`;
  }
  if (field === "bayLabel" && suggestions?.bays?.length) {
    return `${basePrompt}\nAvailable bays:\n- ${suggestions.bays.join("\n- ")}`;
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

const dedupeNames = (names: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const key = normalizeMatchValue(name);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
};

const applyParsedFields = (
  state: BookingIntakeState,
  parsed: Record<string, unknown>
) => ({
  ...state,
  ...Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== null)
  ),
});

const hasGuestContext = (message: string) =>
  /\bguest(s)?\b/i.test(message);

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

  const storedState =
    input.db && input.memberId
      ? await getBookingState<Record<string, unknown>>(input.db, input.memberId)
      : null;
  const persistedState = storedState
    ? unwrapFlowState<BookingIntakeState>(storedState.state, "booking-new")
    : undefined;
  const state: BookingIntakeState = {
    ...(input.defaults ?? {}),
    ...(persistedState ?? {}),
    ...(input.existingState ?? {}),
  };
  if (input.memberId) {
    state.memberId = input.memberId;
  }

  const persistState = async (nextState: BookingIntakeState) => {
    if (input.db && state.memberId) {
      await saveBookingState(
        input.db,
        state.memberId,
        wrapFlowState("booking-new", nextState)
      );
    }
  };

  const clubRepo = input.db ? createClubRepository(input.db) : null;
  const locationRepo = input.db ? createClubLocationRepository(input.db) : null;
  const activeClubs = clubRepo ? await clubRepo.listActive() : [];
  const activeClubNames = activeClubs.map((club) => club.name);

  // Check if this is a simple confirmation message and all required fields are already set.
  // In that case, skip LLM extraction to avoid re-interpreting dates/times from context
  // which can cause issues like "Tomorrow" being re-resolved incorrectly.
  const hasAllRequiredFields =
    state.club &&
    state.preferredDate &&
    state.preferredTime &&
    state.players !== undefined &&
    (state.players === 1 || state.guestNames) &&
    state.notes !== undefined;
  const isSimpleConfirmation = isConfirmationMessage(message);

  // Only run LLM extraction if we need more fields or the message isn't a simple confirmation
  if (!hasAllRequiredFields || !isSimpleConfirmation) {
    try {
      const openrouter = getOpenRouterClient();
      const modelId = resolveModelId();

      // Build context from conversation history if available
      const historyContext = input.conversationHistory?.length
        ? `\nConversation context:\n${input.conversationHistory
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}\n`
        : "";
      const clubContext = activeClubNames.length
        ? `Known clubs: ${activeClubNames.join(
            ", "
          )}. If the user refers to a known club, return the exact name from the list.\n`
        : "";

      const result = await generateObject({
        model: openrouter.chat(modelId),
        schema: BookingIntakeParseSchema,
        system:
          "Extract booking details from the message. Use the user's wording when possible. " +
          "Use conversation context to infer fields (e.g. if the assistant just asked for a club, the user's response is likely the club name). " +
          "For 'notes' or 'guest names', if the user says 'no', 'none', or 'skip', set the field to 'None'.",
        prompt:
          `${historyContext}${clubContext}Extract any of these fields if present from the user message: club, club location, bay, preferred date, preferred time or time window, number of players (1-${getMaxPlayers()}), guest names, notes. ` +
          `If a field is not present, omit it.\n\nUser message: "${message}"`,
      });

      debugLog("Extracted intake fields:", JSON.stringify(result.object));

      const parsedFields: Record<string, unknown> = {
        ...result.object,
        bayLabel: result.object.bay ?? undefined,
      };
      if (typeof parsedFields.guestNames === "string") {
        const normalizedGuest = parsedFields.guestNames.trim().toLowerCase();
        if (
          ["none", "no", "n/a", "na", "nope", "skip"].includes(normalizedGuest) &&
          !hasGuestContext(message)
        ) {
          delete parsedFields.guestNames;
        }
      }

      const previousClub = state.club;
      Object.assign(state, applyParsedFields(state, parsedFields));
    
    // Heuristic: Check if the new 'club' is actually a location or a different club
    if (input.db && state.club && state.clubId && state.club !== previousClub) {
      const clubRepo = createClubRepository(input.db);
      const locationRepo = createClubLocationRepository(input.db);
      
      const currentClub = await clubRepo.getById(state.clubId);
      if (currentClub && currentClub.name.toLowerCase() !== state.club.trim().toLowerCase()) {
        // Mismatch detected. Is the new 'club' actually a location for the current club?
        const locations = await locationRepo.listActiveByClubId(state.clubId);
        const locationMatch = locations.find(l => l.name.toLowerCase() === state.club!.trim().toLowerCase());
        
        if (locationMatch) {
          // It was a location! Fix the state.
          state.clubLocation = locationMatch.name;
          state.clubLocationId = locationMatch.id;
          state.club = currentClub.name; // Revert club name
        } else {
          // It's likely a new club choice. Clear IDs to force re-resolution.
          state.clubId = undefined;
          state.clubLocationId = undefined;
          state.clubLocation = undefined;
        }
      }
    }

  } catch (error) {
    console.error("Booking Intake Extraction Error:", error);
  }
  }
  else {
    debugLog("Skipping LLM extraction for confirmation message, all fields already set");
  }

  if (state.pendingDefaultField) {
    const field = state.pendingDefaultField;
    const defaultValue = input.defaults?.[field];
    if (defaultValue !== undefined && isConfirmationMessage(message)) {
      Object.assign(state, { [field]: defaultValue });
    }
    state.pendingDefaultField = undefined;
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
      await persistState(state);
      return {
        type: "ask",
        prompt: clubSelection.prompt,
        nextState: state,
      };
    }

    if (clubSelection.type === "ask-location") {
      await persistState(state);
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

  if (input.db) {
    const clubs = activeClubs;

    if (state.clubLocationId && !state.clubLocation) {
      const location = await locationRepo?.getById(state.clubLocationId);
      if (location) {
        state.clubLocation = location.name;
        if (!state.clubId) {
          state.clubId = location.clubId;
        }
      }
    }

    if (state.clubId && !state.club) {
      const club = await clubRepo?.getById(state.clubId);
      if (club) {
        state.club = club.name;
      }
    }

    if (state.club && !state.clubId) {
      const club = await resolveClubByName(input.db, state.club, clubs);
      if (!club) {
        const prompt = buildAskPrompt("club", "Which club would you like to book?", {
          ...input.suggestions,
          clubs: clubs.map((item) => item.name)
        });
        await persistState(state);
        return { type: "ask", prompt, nextState: state };
      }
      state.clubId = club.id;
      state.club = club.name;
    }

    if (state.clubId) {
      const locations = await locationRepo?.listActiveByClubId(state.clubId);
      const resolvedLocations = locations ?? [];
      const locationNames = resolvedLocations.map((location) => location.name);

      if (!state.clubLocation && resolvedLocations.length === 1) {
        state.clubLocation = resolvedLocations[0].name;
        state.clubLocationId = resolvedLocations[0].id;
      } else if (!state.clubLocation && resolvedLocations.length > 1) {
        const defaultLocation = input.defaults?.clubLocation;
        if (
          defaultLocation &&
          locationNames.some(
            (name) =>
              name.trim().toLowerCase() === defaultLocation.trim().toLowerCase()
          )
        ) {
          state.pendingDefaultField = "clubLocation";
          await persistState(state);
          return {
            type: "confirm-default",
            prompt: buildDefaultPrompt("clubLocation", String(defaultLocation)),
            nextState: state
          };
        }
        const prompt = buildAskPrompt(
          "clubLocation",
          "Which location should we use for that club?",
          { ...input.suggestions, clubLocations: locationNames }
        );
        await persistState(state);
        return { type: "ask", prompt, nextState: state };
      }

      if (state.clubLocation && !state.clubLocationId) {
        const match = resolvedLocations.find(
          (location) =>
            location.name.trim().toLowerCase() ===
            state.clubLocation?.trim().toLowerCase()
        );
        if (!match) {
          const prompt = buildAskPrompt(
            "clubLocation",
            "Which location should we use for that club?",
            { ...input.suggestions, clubLocations: locationNames }
          );
          await persistState(state);
          return { type: "ask", prompt, nextState: state };
        }
        state.clubLocationId = match.id;
        state.clubLocation = match.name;
      }
    }
  }

  if (state.preferredDate) {
    const parsedDate = parsePreferredDate(state.preferredDate);
    if (!parsedDate) {
      state.preferredDate = undefined;
      await persistState(state);
      return {
        type: "ask",
        prompt: buildAskPrompt(
          "preferredDate",
          "What date would you like?"
        ),
        nextState: state,
      };
    }
    state.preferredDate = parsedDate;
  }

  if (state.preferredTime) {
    const parsedTime = parsePreferredTimeWindow(state.preferredTime);
    if (!parsedTime) {
      state.preferredTime = undefined;
      state.preferredTimeEnd = undefined;
      await persistState(state);
      return {
        type: "ask",
        prompt: buildAskPrompt(
          "preferredTime",
          "What time (or time window) should we request?"
        ),
        nextState: state,
      };
    }
    state.preferredTime = parsedTime.start;
    state.preferredTimeEnd = parsedTime.end ?? undefined;
  }

  const shouldValidate =
    !isConfirmationMessage(message) &&
    (state.players !== undefined || state.preferredDate || state.preferredTime);
  if (shouldValidate) {
    try {
      const openrouter = getOpenRouterClient();
      const modelId = resolveModelId();
      const todayIso = parsePreferredDate("today") ?? new Date().toISOString().slice(0, 10);
      const result = await generateObject({
        model: openrouter.chat(modelId),
        schema: BookingValidationSchema,
        system:
          "Validate booking fields. " +
          "playersValid is true only if players is between 1 and 4. " +
          "dateValid is true only if the date is not in the past. " +
          "timeValid is true only if the time is parseable. " +
          "Return JSON with issues describing why fields are invalid.",
        prompt:
          `Today is ${todayIso}.\n` +
          `User message: "${message}"\n` +
          `Extracted players: ${state.players ?? "null"}\n` +
          `Extracted date: ${state.preferredDate ?? "null"}\n` +
          `Extracted time: ${state.preferredTime ?? "null"}`,
      });

      if (!result.object.playersValid && state.players !== undefined) {
        state.players = undefined;
        await persistState(state);
        return {
          type: "ask",
          prompt: buildAskPrompt(
            "players",
            `How many players (1-${getMaxPlayers()})?`
          ),
          nextState: state,
        };
      }

      if (!result.object.dateValid && state.preferredDate) {
        state.preferredDate = undefined;
        await persistState(state);
        return {
          type: "ask",
          prompt: buildAskPrompt(
            "preferredDate",
            "That date is in the past. What date would you like instead?"
          ),
          nextState: state,
        };
      }

      if (!result.object.timeValid && state.preferredTime) {
        state.preferredTime = undefined;
        state.preferredTimeEnd = undefined;
        await persistState(state);
        return {
          type: "ask",
          prompt: buildAskPrompt(
            "preferredTime",
            "What time (or time window) should we request?"
          ),
          nextState: state,
        };
      }
    } catch (error) {
      console.error("Booking validation error:", error);
    }
  }

  if (state.players !== undefined) {
    const normalized = normalizePlayers(state.players);
    if (!normalized) {
      state.players = undefined;
      await persistState(state);
      return {
        type: "ask",
        prompt: buildAskPrompt("players", `How many players (1-${getMaxPlayers()})?`),
        nextState: state,
      };
    }
    state.players = normalized;
  }

  if (state.guestNames) {
    state.guestNames = state.guestNames.trim();
  }
  if (state.notes) {
    state.notes = state.notes.trim();
  }

  const missing = missingFields(state);
  if (missing) {
    const field = missing[0];

    if (field === "club" && input.db && !input.suggestions?.clubs?.length) {
      const clubs = activeClubs;
      if (clubs.length > 0) {
        if (!input.suggestions) input.suggestions = {};
        input.suggestions.clubs = clubs.map((c) => c.name);
      }
    }

    const defaultValue = input.defaults?.[field];
    if (defaultValue !== undefined) {
      state.pendingDefaultField = field;
      await persistState(state);
      return {
        type: "confirm-default",
        prompt: buildDefaultPrompt(field, String(defaultValue)),
        nextState: state,
      };
    }
    await persistState(state);
    return {
      type: "ask",
      prompt: buildAskPrompt(field, missing[1], input.suggestions),
      nextState: state,
    };
  }

  if (
    !input.availability &&
    input.getAvailability &&
    state.clubLocationId &&
    state.preferredTime
  ) {
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

  if (
    !input.availability &&
    input.db &&
    state.clubLocationId &&
    state.preferredTime
  ) {
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

  if (
    !input.availability &&
    input.getAvailability &&
    state.clubLocation &&
    state.preferredTime
  ) {
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
    await persistState(state);
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
  const bayPromptLimitRaw = Number.parseInt(
    process.env.BOOKING_BAY_PROMPT_LIMIT ?? "8",
    10
  );
  const bayPromptLimit = Number.isFinite(bayPromptLimitRaw)
    ? bayPromptLimitRaw
    : 8;
  const shouldPromptForBay =
    bayPromptLimit > 0 &&
    availableBayNames.length > 0 &&
    availableBayNames.length <= bayPromptLimit;
  const uniqueBayNames = dedupeNames(availableBayNames);
  const normalizedMessage = message?.trim() ?? "";

  if (
    shouldPromptForBay &&
    !state.bayLabel &&
    /^\d+$/.test(normalizedMessage)
  ) {
    state.bayLabel = `Bay ${normalizedMessage}`;
  }

  if (state.bayLabel && availableBayNames.length) {
    const normalized = normalizeMatchValue(state.bayLabel);
    const availableBays =
      input.availability?.availableBays ??
      availableBayNames.map((name) => ({ id: name, name }));
    const match = availableBays.find(
      (bay) => normalizeMatchValue(bay.name) === normalized
    );
    if (match) {
      state.bayId = match.id;
      state.bayLabel = match.name;
    }
    if (!match) {
      state.bayLabel = undefined;
      if (shouldPromptForBay) {
        await persistState(state);
        return {
          type: "ask",
          prompt: buildAskPrompt(
            "bayLabel",
            "Which bay should we use?",
            { ...input.suggestions, bays: uniqueBayNames }
          ),
          nextState: state,
        };
      }
    }
  }

  if (shouldPromptForBay && !state.bayLabel) {
    const defaultBay = input.defaults?.bayLabel;
    if (defaultBay) {
      state.pendingDefaultField = "bayLabel";
      await persistState(state);
      return {
        type: "confirm-default",
        prompt: buildDefaultPrompt("bayLabel", String(defaultBay)),
        nextState: state,
      };
    }
    await persistState(state);
    return {
      type: "ask",
      prompt: buildAskPrompt(
        "bayLabel",
        "Which bay should we use?",
        { ...input.suggestions, bays: uniqueBayNames }
      ),
      nextState: state,
    };
  }

  const confirmed = input.confirmed ?? isConfirmationMessage(message);
  if (confirmed) {
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
            return {
              bookingId: booking.id,
              status: booking.status,
              bookingReference: booking.bookingReference ?? null,
            };
          }
        : undefined);
    if (submit) {
      try {
        const result = await submit(state);
        if (input.db && state.memberId) {
          await clearBookingState(input.db, state.memberId);
        }
        const referenceText = result.bookingReference
          ? ` Reference: ${result.bookingReference}.`
          : "";
        return {
          type: "submitted",
          bookingId: result.bookingId,
          message: `Your booking request is ${result.status}.${referenceText}`,
        };
      } catch (error) {
        if (isBookingInPastError(error)) {
          state.preferredDate = undefined;
          state.preferredTime = undefined;
          state.preferredTimeEnd = undefined;
          await persistState(state);
          return {
            type: "ask",
            prompt: buildAskPrompt(
              "preferredDate",
              "That time is in the past. What date would you like instead?"
            ),
            nextState: state,
          };
        }
        if (isBookingTooSoonError(error)) {
          state.preferredTime = undefined;
          state.preferredTimeEnd = undefined;
          await persistState(state);
          return {
            type: "ask",
            prompt: buildAskPrompt(
              "preferredTime",
              "That time is too soon. What time would you like instead?"
            ),
            nextState: state,
          };
        }
        throw error;
      }
    }
    return { type: "submit", payload: state };
  }

  await persistState(state);
  return {
    type: "review",
    summary: formatSummary(state),
    nextState: state,
  };
};
