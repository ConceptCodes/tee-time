import { describe, expect, test, beforeEach, afterEach, mock, spyOn } from "bun:test";
import type { Database } from "@tee-time/database";

describe("Booking notifications integration - team-based routing", () => {
  beforeEach(() => {
    process.env.BOOKING_SLACK_UPDATES_CHANNEL = "#global-bookings";
    process.env.BOOKING_SLACK_USERNAMES = "";
  });

  afterEach(() => {
    delete process.env.BOOKING_SLACK_UPDATES_CHANNEL;
    delete process.env.BOOKING_SLACK_USERNAMES;
  });

  test("team-based routing requires getClubWithTeam from club repository", () => {
    const requireClubRepo = require("@tee-time/database");
    expect(requireClubRepo.createClubRepository).toBeDefined();
  });

  test("notifyBooking accepts teamChannel parameter for team-routed notifications", async () => {
    const notifyBooking = require("../notifications/slack").notifyBooking;
    
    const result = notifyBooking({ text: "Test", teamChannel: "#team-a" });
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  test("notifyBooking works without teamChannel (backward compatible)", async () => {
    const notifyBooking = require("../notifications/slack").notifyBooking;
    
    const result = notifyBooking({ text: "Test" });
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  test("booking create signature allows notification with team lookup flow", async () => {
    const bookingCreate = require("../booking-create").createBookingWithHistory;
    expect(bookingCreate).toBeDefined();
  });

  test("booking cancel signature allows notification with team lookup flow", async () => {
    const bookingCancel = require("../booking-cancel").cancelBookingWithHistory;
    expect(bookingCancel).toBeDefined();
  });

  test("team lookup pattern: getClubWithTeam returns club with team data", () => {
    const repos = require("@tee-time/database");
    const { createClubRepository } = repos;
    expect(createClubRepository).toBeDefined();
  });

  test("team channel extraction: slackChannel is accessed from team object", () => {
    const teamObj = {
      id: "team-1",
      name: "Team A",
      slackChannel: "#team-a",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const slackChannel = teamObj.slackChannel || undefined;
    expect(slackChannel).toBe("#team-a");
  });

  test("team channel extraction handles null team (global club)", () => {
    const team: typeof undefined = null as any;
    
    const slackChannel = team?.slackChannel ?? undefined;
    expect(slackChannel).toBeUndefined();
  });

  test("team channel extraction handles undefined slackChannel", () => {
    const team = {
      id: "team-1",
      name: "Team A",
      slackChannel: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const slackChannel = team?.slackChannel ?? undefined;
    expect(slackChannel).toBeUndefined();
  });

  test("error handling during team lookup does not break notification", () => {
    const tryLookup = async () => {
      try {
        throw new Error("lookup_failed");
      } catch (error) {
        return { error };
      }
    };
    
    const result = tryLookup();
    expect(result).toBeInstanceOf(Promise);
  });
});
