import { describe, expect, test } from "bun:test";
import {
  formatTimeLabel,
  formatTimeRangeLabel,
  formatDateLabel,
  formatBookingSummary,
  formatCancelSummary,
  formatModifySummary,
} from "../formatting";

describe("formatTimeLabel", () => {
  test("formats time with meridiem", () => {
    expect(formatTimeLabel("14:30")).toBe("2:30pm");
    expect(formatTimeLabel("09:00")).toBe("9am");
    expect(formatTimeLabel("12:00")).toBe("12pm");
    expect(formatTimeLabel("00:00")).toBe("12am");
  });

  test("handles invalid input", () => {
    expect(formatTimeLabel(undefined)).toBe(null);
    expect(formatTimeLabel("invalid")).toBe("invalid");
  });
});

describe("formatTimeRangeLabel", () => {
  test("formats time range", () => {
    const state = { preferredTime: "14:00", preferredTimeEnd: "16:00" };
    expect(formatTimeRangeLabel(state)).toBe("2pm-4pm");
  });

  test("handles single time", () => {
    const state = { preferredTime: "14:00" };
    expect(formatTimeRangeLabel(state)).toBe("2pm");
  });
});

describe("formatDateLabel", () => {
  test("formats ISO date", () => {
    expect(formatDateLabel("2025-12-30")).toMatch(/Dec 30/);
  });

  test("handles invalid input", () => {
    expect(formatDateLabel(undefined)).toBe(null);
    expect(formatDateLabel("invalid")).toBe("invalid");
  });
});

describe("formatBookingSummary", () => {
  test("formats booking summary", () => {
    const state = {
      club: "Topgolf",
      clubLocation: "Dallas",
      preferredDate: "2025-12-30",
      preferredTime: "14:00",
      players: 2,
      guestNames: "John",
    };
    const summary = formatBookingSummary(state);
    expect(summary).toContain("⛳ Club: Topgolf (Dallas)");
    expect(summary).toContain("📅 Date:");
    expect(summary).toContain("👥 Players: 2");
    expect(summary).toContain("👤 Guests: John");
  });
});

describe("formatCancelSummary", () => {
  test("formats cancel summary", () => {
    const state = {
      bookingId: "123",
      bookingReference: "ABC123",
      club: "Topgolf",
      preferredDate: "2025-12-30",
    };
    const summary = formatCancelSummary(state);
    expect(summary).toContain("Cancel the booking with:");
    expect(summary).toContain("🆔 Booking ID: 123");
    expect(summary).toContain("🎫 Reference: ABC123");
  });
});

describe("formatModifySummary", () => {
  test("formats modify summary", () => {
    const state = {
      bookingId: "123",
      preferredDate: "2025-12-30",
      players: 3,
    };
    const summary = formatModifySummary(state);
    expect(summary).toContain("Update the booking with:");
    expect(summary).toContain("🆔 Booking ID: 123");
    expect(summary).toContain("👥 Players: 3");
  });
});
