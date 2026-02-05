import {
  parsePreferredDate,
  parsePreferredTimeWindow,
  getMaxPlayers,
  normalizePlayers,
} from "../booking-validation";

describe("parsePreferredDate", () => {
  const mockNow = new Date("2026-02-05T12:00:00Z");

  it("returns null for empty input", () => {
    expect(parsePreferredDate("", mockNow)).toBeNull();
    expect(parsePreferredDate(undefined, mockNow)).toBeNull();
    expect(parsePreferredDate("   ", mockNow)).toBeNull();
  });

  it("parses 'today'", () => {
    expect(parsePreferredDate("today", mockNow)).toBe("2026-02-05");
  });

  it("parses 'tomorrow'", () => {
    expect(parsePreferredDate("tomorrow", mockNow)).toBe("2026-02-06");
  });

  it("parses ISO format dates", () => {
    expect(parsePreferredDate("2026-12-25", mockNow)).toBe("2026-12-25");
  });

  it("parses US format dates", () => {
    expect(parsePreferredDate("12/25/2026", mockNow)).toBe("2026-12-25");
    expect(parsePreferredDate("12-25-2026", mockNow)).toBe("2026-12-25");
  });

  it("parses weekday names", () => {
    const result = parsePreferredDate("monday", mockNow);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("parses 'next' weekday", () => {
    const result = parsePreferredDate("next monday", mockNow);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("parses 'this' weekday", () => {
    const result = parsePreferredDate("this friday", mockNow);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("parsePreferredTimeWindow", () => {
  it("returns null for empty input", () => {
    expect(parsePreferredTimeWindow("")).toBeNull();
    expect(parsePreferredTimeWindow(undefined)).toBeNull();
  });

  it("parses simple times", () => {
    expect(parsePreferredTimeWindow("2pm")).toEqual({ start: "14:00", end: null });
    expect(parsePreferredTimeWindow("2:30pm")).toEqual({ start: "14:30", end: null });
    expect(parsePreferredTimeWindow("10am")).toEqual({ start: "10:00", end: null });
  });

  it("parses 24-hour times", () => {
    expect(parsePreferredTimeWindow("14:00")).toEqual({ start: "14:00", end: null });
    expect(parsePreferredTimeWindow("09:30")).toEqual({ start: "09:30", end: null });
  });

  it("parses time windows with 'to'", () => {
    expect(parsePreferredTimeWindow("2pm to 4pm")).toEqual({
      start: "14:00",
      end: "16:00",
    });
  });

  it("parses time windows with '-'", () => {
    expect(parsePreferredTimeWindow("10:00 - 12:00")).toEqual({
      start: "10:00",
      end: "12:00",
    });
  });

  it("parses 'between X and Y' format", () => {
    expect(parsePreferredTimeWindow("between 9am and 11am")).toEqual({
      start: "09:00",
      end: "11:00",
    });
  });

  it("handles noon and midnight", () => {
    expect(parsePreferredTimeWindow("noon")).toEqual({ start: "12:00", end: null });
    expect(parsePreferredTimeWindow("midnight")).toEqual({ start: "00:00", end: null });
  });
});

describe("getMaxPlayers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BOOKING_MAX_PLAYERS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns default value of 4", () => {
    expect(getMaxPlayers()).toBe(4);
  });

  it("returns env value when set", () => {
    process.env.BOOKING_MAX_PLAYERS = "6";
    expect(getMaxPlayers()).toBe(6);
  });

  it("returns default for invalid env value", () => {
    process.env.BOOKING_MAX_PLAYERS = "invalid";
    expect(getMaxPlayers()).toBe(4);
  });
});

describe("normalizePlayers", () => {
  it("returns null for undefined/null", () => {
    expect(normalizePlayers(undefined)).toBeNull();
    expect(normalizePlayers(null as unknown as undefined)).toBeNull();
  });

  it("returns null for non-numeric strings", () => {
    expect(normalizePlayers("abc")).toBeNull();
  });

  it("normalizes valid numbers", () => {
    expect(normalizePlayers(2)).toBe(2);
    expect(normalizePlayers("4")).toBe(4);
  });

  it("floors decimal values", () => {
    expect(normalizePlayers(2.9)).toBe(2);
  });

  it("respects max players limit", () => {
    expect(normalizePlayers(10, 4)).toBeNull();
    expect(normalizePlayers(0)).toBeNull();
    expect(normalizePlayers(-1)).toBeNull();
  });
});
