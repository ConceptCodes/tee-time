import {
  findBestFuzzyMatch,
  debugLog,
  normalizeMatchValue,
  levenshteinDistance,
  sanitizePromptInput
} from "../utils";
import { generateObject } from "ai";
import { z } from "zod";
import { getOpenRouterClient, resolveModelId } from "../provider";

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

const ClubDisambiguationSchema = z.object({
  selectedClub: z.string().nullable(),
  reason: z.string(),
  needsMoreInfo: z.boolean(),
  suggestedQuestions: z.array(z.string()).optional(),
});

/**
 * Uses LLM to disambiguate between clubs when fuzzy matching is uncertain
 */
async function disambiguateClubWithLLM({
  message,
  clubs,
  existingState,
}: {
  message: string;
  clubs: string[];
  existingState?: Partial<ClubSelectionState>;
}): Promise<{
  resolvedClub: string | null;
  text: string | null;
}> {
  const clubList = clubs.join(", ");
  const selectedContext = existingState?.club
    ? `\n\nUser previously selected: ${existingState.club}`
    : "";

  const prompt = `The user said: "${sanitizePromptInput(message)}"

Available clubs: ${clubList}${selectedContext}

Determine which club the user wants:
- If they clearly mention one specific club (even with typos or slang), return the club name
- If they say "that one" or "the one I mentioned" and there's a previously selected club, use that
- If their input is too ambiguous, ask a clarifying question
- Be smart about common misspellings (e.g., "top golf" -> "Topgolf", "drive shack" -> "Drive Shack")
- Recognize variations like "pop stroke" -> "PopStroke", "puttery" -> "Puttery"`;

  try {
    const client = getOpenRouterClient();
    const modelId = resolveModelId("default");

    const result = await generateObject({
      model: client(modelId),
      schema: ClubDisambiguationSchema,
      prompt,
      temperature: 0.3,
    });

    const decision = result.object as z.infer<typeof ClubDisambiguationSchema>;
    debugLog(`🤖 LLM disambiguation: ${decision.reason}`);

    if (decision.selectedClub) {
      const matchedClub = clubs.find(
        (c) => c.toLowerCase() === decision.selectedClub?.toLowerCase()
      );
      if (matchedClub) {
        return {
          resolvedClub: matchedClub,
          text: `Great choice! I've selected **${matchedClub}**.`,
        };
      }
    }

    if (decision.needsMoreInfo) {
      return {
        resolvedClub: null,
        text: decision.reason,
      };
    }

    return { resolvedClub: null, text: null };
  } catch (error) {
    debugLog(`⚠ LLM disambiguation failed: ${error}`);
    return { resolvedClub: null, text: null };
  }
}

export const runClubSelectionFlow = async (
  input: ClubSelectionInput
): Promise<ClubSelectionDecision> => {
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
      const fuzzyMatch = findBestFuzzyMatch(message, input.clubs);
      if (fuzzyMatch) {
        // Calculate similarity to decide if we need LLM confirmation
        const normalizedInput = normalize(message);
        const normalizedMatch = normalize(fuzzyMatch);
        const distance = levenshteinDistance(normalizedInput, normalizedMatch);
        const maxLen = Math.max(normalizedInput.length, normalizedMatch.length);
        const similarity = 1 - distance / maxLen;

        if (similarity < 0.6) {
          // Weak fuzzy match - use LLM disambiguation
          debugLog(`⚠ Weak fuzzy match (${Math.round(similarity * 100)}%): "${fuzzyMatch}" - using LLM disambiguation`);
          const llmResult = await disambiguateClubWithLLM({
            message,
            clubs: input.clubs,
            existingState: input.existingState,
          });

          if (llmResult.resolvedClub) {
            state.club = llmResult.resolvedClub;
            return {
              type: "select",
              selection: state,
            };
          }

          if (llmResult.text) {
            return {
              type: "clarify",
              prompt: llmResult.text,
            };
          }
        } else {
          debugLog(`✓ Strong fuzzy match (${Math.round(similarity * 100)}%): "${fuzzyMatch}"`);
          state.club = fuzzyMatch;
        }
      } else {
        // No fuzzy match - use LLM for disambiguation
        const llmResult = await disambiguateClubWithLLM({
          message,
          clubs: input.clubs,
          existingState: input.existingState,
        });

        if (llmResult.resolvedClub) {
          state.club = llmResult.resolvedClub;
          return {
            type: "select",
            selection: state,
          };
        }

        if (llmResult.text) {
          return {
            type: "clarify",
            prompt: llmResult.text,
          };
        }

        return {
          type: "ask-club",
          prompt: `Which club should we use? Options: ${input.clubs.join(", ")}.`,
          nextState: state,
        };
      }
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
      const fuzzyMatch = findBestFuzzyMatch(message, locationOptions);
      if (fuzzyMatch) {
        debugLog(`Fuzzy matched location "${message}" to "${fuzzyMatch}"`);
        state.clubLocation = fuzzyMatch;
      } else {
        return {
          type: "ask-location",
          prompt: `Which location for ${state.club}? Options: ${locationOptions.join(
            ", "
          )}.`,
          nextState: state,
        };
      }
    }
  } else if (locationOptions.length === 1) {
    state.clubLocation = locationOptions[0];
  }

  return {
    type: "select",
    selection: state,
  };
};
