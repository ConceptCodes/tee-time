export type ClubSelectionInput = {
  message: string;
  clubs: string[];
  locations?: Array<{ club: string; locations: string[] }>;
  existingState?: Partial<ClubSelectionState>;
};

export type ClubSelectionState = {
  club?: string;
  clubLocation?: string;
};

export type ClubSelectionDecision =
  | {
      type: "ask-club";
      prompt: string;
      nextState: ClubSelectionState;
    }
  | {
      type: "ask-location";
      prompt: string;
      nextState: ClubSelectionState;
    }
  | {
      type: "select";
      selection: ClubSelectionState;
    }
  | {
      type: "clarify";
      prompt: string;
    };

const normalize = (value: string) => value.trim().toLowerCase();

const matchByName = (value: string, options: string[]) => {
  const normalized = normalize(value);
  return options.find((option) => normalize(option) === normalized);
};

const tryMatch = (message: string, options: string[]) => {
  const normalized = normalize(message);
  return options.find((option) => normalized.includes(normalize(option)));
};

export const runClubSelectionFlow = (
  input: ClubSelectionInput
): ClubSelectionDecision => {
  const message = input.message?.trim();
  if (!message) {
    return {
      type: "clarify",
      prompt: "Which club should we use?",
    };
  }

  const state: ClubSelectionState = { ...(input.existingState ?? {}) };

  if (!state.club) {
    const matched = tryMatch(message, input.clubs);
    if (matched) {
      state.club = matched;
    } else {
      return {
        type: "ask-club",
        prompt: `Which club should we use? Options: ${input.clubs.join(", ")}.`,
        nextState: state,
      };
    }
  }

  const locationOptions =
    input.locations?.find((entry) => entry.club === state.club)?.locations ??
    [];

  if (locationOptions.length > 1 && !state.clubLocation) {
    const matched =
      matchByName(message, locationOptions) ??
      tryMatch(message, locationOptions);
    if (matched) {
      state.clubLocation = matched;
    } else {
      return {
        type: "ask-location",
        prompt: `Which location for ${state.club}? Options: ${locationOptions.join(
          ", "
        )}.`,
        nextState: state,
      };
    }
  } else if (locationOptions.length === 1) {
    state.clubLocation = locationOptions[0];
  }

  return {
    type: "select",
    selection: state,
  };
};
