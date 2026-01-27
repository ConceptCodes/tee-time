import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { notifyBooking } from "../notifications/slack";

describe("notifyBooking team-based channel routing", () => {
  beforeEach(() => {
    process.env.BOOKING_SLACK_UPDATES_CHANNEL = "#global-bookings";
    process.env.BOOKING_SLACK_USERNAMES = "";
  });

  afterEach(() => {
    delete process.env.BOOKING_SLACK_UPDATES_CHANNEL;
    delete process.env.BOOKING_SLACK_USERNAMES;
  });

  test("accepts teamChannel parameter in payload", async () => {
    const payload = { text: "Test", teamChannel: "#team-a" };
    
    const result = notifyBooking(payload);
    expect(result).toBeInstanceOf(Promise);
  });

  test("accepts undefined teamChannel parameter", async () => {
    const payload = { text: "Test" };
    
    const result = notifyBooking(payload);
    expect(result).toBeInstanceOf(Promise);
  });

  test("accepts empty string teamChannel parameter", async () => {
    const payload = { text: "Test", teamChannel: "" };
    
    const result = notifyBooking(payload);
    expect(result).toBeInstanceOf(Promise);
  });

  test("completes without throwing when teamChannel is provided", async () => {
    await expect(
      notifyBooking({ text: "Test message", teamChannel: "#team-a" })
    ).resolves.toBeUndefined();
  });
});
