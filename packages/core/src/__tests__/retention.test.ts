import { describe, expect, test } from "bun:test";
import { getRetentionCutoff, parseRetentionDays } from "../retention";

const withEnv = (key: string, value: string | undefined, fn: () => void) => {
  const original = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
};

describe("parseRetentionDays", () => {
  test("uses default when env is missing", () => {
    withEnv("RETENTION_DAYS", undefined, () => {
      expect(parseRetentionDays()).toBe(90);
    });
  });

  test("returns null when env is zero or negative", () => {
    withEnv("RETENTION_DAYS", "0", () => {
      expect(parseRetentionDays()).toBe(null);
    });
    withEnv("RETENTION_DAYS", "-5", () => {
      expect(parseRetentionDays()).toBe(null);
    });
  });

  test("returns parsed value for valid env", () => {
    withEnv("RETENTION_DAYS", "30", () => {
      expect(parseRetentionDays()).toBe(30);
    });
  });
});

describe("getRetentionCutoff", () => {
  test("computes cutoff from now and retention days", () => {
    const now = new Date("2025-01-11T00:00:00Z");
    const cutoff = getRetentionCutoff(now, 10);
    expect(cutoff?.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  test("returns null when retention is disabled", () => {
    const now = new Date("2025-01-11T00:00:00Z");
    const cutoff = getRetentionCutoff(now, null);
    expect(cutoff).toBe(null);
  });
});
