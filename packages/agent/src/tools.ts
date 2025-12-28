import { tool } from "ai";
import { z } from "zod";
import {
  createClubRepository,
  createClubLocationRepository,
  type Database,
} from "@tee-time/database";
import {
  getBayAvailability,
  getMaxPlayers,
  parsePreferredDate,
  parsePreferredTimeWindow,
  normalizePlayers,
  retrieveFaqAnswer,
} from "@tee-time/core";

/**
 * Creates a tool to validate and resolve a club name against the whitelist.
 */
export const createValidateClubTool = (db: Database) =>
  tool({
    description:
      "Validate if a club name is in the approved whitelist and return its details",
    inputSchema: z.object({
      clubName: z.string().describe("The club name to validate"),
    }),
    execute: async ({ clubName }: { clubName: string }) => {
      const repo = createClubRepository(db);
      const clubs = await repo.listActive();
      const normalized = clubName.trim().toLowerCase();
      const match = clubs.find(
        (club) => club.name.trim().toLowerCase() === normalized
      );
      if (match) {
        return {
          valid: true,
          clubId: match.id,
          clubName: match.name,
          suggestions: null,
        };
      }
      return {
        valid: false,
        clubId: null,
        clubName: null,
        suggestions: clubs.slice(0, 5).map((c) => c.name),
      };
    },
  });

/**
 * Creates a tool to list and resolve club locations.
 */
export const createResolveClubLocationTool = (db: Database) =>
  tool({
    description:
      "Get available locations for a specific club and optionally validate a location name",
    inputSchema: z.object({
      clubId: z.string().describe("The club ID to get locations for"),
      locationName: z
        .string()
        .optional()
        .describe("Optional location name to validate"),
    }),
    execute: async ({
      clubId,
      locationName,
    }: {
      clubId: string;
      locationName?: string;
    }) => {
      const repo = createClubLocationRepository(db);
      const locations = await repo.listActiveByClubId(clubId);

      if (locationName) {
        const normalized = locationName.trim().toLowerCase();
        const match = locations.find(
          (loc) => loc.name.trim().toLowerCase() === normalized
        );
        if (match) {
          return {
            valid: true,
            locationId: match.id,
            locationName: match.name,
            allLocations: locations.map((l) => l.name),
          };
        }
      }

      return {
        valid: false,
        locationId: null,
        locationName: null,
        allLocations: locations.map((l) => l.name),
      };
    },
  });

/**
 * Creates a tool to check bay availability at a club location.
 */
export const createCheckAvailabilityTool = (db: Database) =>
  tool({
    description:
      "Check bay availability for a specific club location, date, and time",
    inputSchema: z.object({
      clubLocationId: z
        .string()
        .describe("The club location ID to check availability for"),
      preferredDate: z
        .string()
        .optional()
        .describe("The preferred date (YYYY-MM-DD format)"),
      preferredTime: z
        .string()
        .optional()
        .describe("The preferred time (HH:MM format)"),
    }),
    execute: async ({ clubLocationId }: { clubLocationId: string }) => {
      const availability = await getBayAvailability(db, clubLocationId);
      return {
        locationFull: availability.locationFull,
        availableBays: availability.availableBays,
        suggestedTimes: availability.suggestedTimes,
      };
    },
  });

/**
 * Tool to parse and validate a preferred date from natural language.
 */
export const parseDateTool = tool({
  description:
    "Parse a natural language date (like 'tomorrow', 'next Monday', '12/25') into ISO format",
  inputSchema: z.object({
    dateInput: z.string().describe("The date input to parse"),
  }),
  execute: async ({ dateInput }: { dateInput: string }) => {
    const parsed = parsePreferredDate(dateInput);
    return {
      valid: !!parsed,
      isoDate: parsed,
      originalInput: dateInput,
    };
  },
});

/**
 * Tool to parse and validate a preferred time or time window.
 */
export const parseTimeTool = tool({
  description:
    "Parse a time or time window (like '2pm', '2-4pm', '14:00 to 16:00') into 24-hour format",
  inputSchema: z.object({
    timeInput: z.string().describe("The time input to parse"),
  }),
  execute: async ({ timeInput }: { timeInput: string }) => {
    const parsed = parsePreferredTimeWindow(timeInput);
    if (!parsed) {
      return {
        valid: false,
        startTime: null,
        endTime: null,
        originalInput: timeInput,
      };
    }
    return {
      valid: true,
      startTime: parsed.start,
      endTime: parsed.end ?? null,
      originalInput: timeInput,
    };
  },
});

/**
 * Tool to validate player count.
 */
export const validatePlayersTool = tool({
  description: `Validate the number of players (must be 1-${getMaxPlayers()})`,
  inputSchema: z.object({
    players: z.number().describe("The number of players"),
  }),
  execute: async ({ players }: { players: number }) => {
    const maxPlayers = getMaxPlayers();
    const normalized = normalizePlayers(players, maxPlayers);
    return {
      valid: !!normalized,
      players: normalized,
      message:
        normalized === null
          ? `Player count must be between 1 and ${maxPlayers}`
          : `${normalized} players confirmed`,
    };
  },
});

/**
 * Creates a tool to search FAQs using embeddings.
 */
export const createSearchFaqsTool = (db: Database) =>
  tool({
    description:
      "Search frequently asked questions about membership, policies, hours, pricing, etc.",
    inputSchema: z.object({
      question: z.string().describe("The question to search for"),
    }),
    execute: async ({ question }: { question: string }) => {
      const result = await retrieveFaqAnswer(db, question);
      if (!result) {
        return {
          found: false,
          answer: null,
          confidence: 0,
        };
      }
      return {
        found: true,
        answer: result.answer,
        confidence: result.confidence,
      };
    },
  });

/**
 * Tool to request human support handoff.
 */
export const escalateToHumanTool = tool({
  description:
    "Request to connect the user to human staff support when the bot cannot help",
  inputSchema: z.object({
    reason: z.string().describe("The reason for escalating to human support"),
    summary: z
      .string()
      .optional()
      .describe("A brief summary of the user's request"),
  }),
  execute: async ({
    reason,
    summary,
  }: {
    reason: string;
    summary?: string;
  }) => {
    return {
      escalated: true,
      reason,
      summary: summary ?? "User requested human assistance",
      message:
        "I'll connect you to our staff. Someone will be with you shortly.",
    };
  },
});

/**
 * Builds all database-dependent tools.
 */
export const createAgentTools = (db: Database) => ({
  validateClub: createValidateClubTool(db),
  resolveClubLocation: createResolveClubLocationTool(db),
  checkAvailability: createCheckAvailabilityTool(db),
  parseDate: parseDateTool,
  parseTime: parseTimeTool,
  validatePlayers: validatePlayersTool,
  searchFaqs: createSearchFaqsTool(db),
  escalateToHuman: escalateToHumanTool,
});

/**
 * Type for the tools object.
 */
export type AgentTools = ReturnType<typeof createAgentTools>;
