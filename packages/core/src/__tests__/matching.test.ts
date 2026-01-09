import { describe, expect, test } from "bun:test";
import {
  normalizeMatchValue,
  levenshteinDistance,
  findBestFuzzyMatch,
} from "../matching";

describe("normalizeMatchValue", () => {
  test("lowercases and removes special characters", () => {
    expect(normalizeMatchValue("Topgolf Dallas")).toBe("topgolfdallas");
    expect(normalizeMatchValue("Bay 1")).toBe("bay1");
    expect(normalizeMatchValue("O'Hare")).toBe("ohare");
  });

  test("trims whitespace", () => {
    expect(normalizeMatchValue("  Dallas  ")).toBe("dallas");
  });

  test("removes punctuation", () => {
    expect(normalizeMatchValue("Hello, World!")).toBe("helloworld");
  });
});

describe("levenshteinDistance", () => {
  test("calculates distance correctly", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("book", "back")).toBe(2);
    expect(levenshteinDistance("same", "same")).toBe(0);
  });

  test("normalizes before comparing", () => {
    expect(levenshteinDistance("Topgolf", "TOPGOLF")).toBe(0);
    expect(levenshteinDistance("Bay 1", "bay1")).toBe(0);
  });
});

describe("findBestFuzzyMatch", () => {
  test("finds best match below threshold", () => {
    const candidates = ["Topgolf", "Drive Shack", "PopStroke"];
    expect(findBestFuzzyMatch("topgolf", candidates)).toBe("Topgolf");
    expect(findBestFuzzyMatch("drive shack", candidates)).toBe("Drive Shack");
  });

  test("returns null if no match below threshold", () => {
    const candidates = ["Topgolf", "Drive Shack"];
    expect(findBestFuzzyMatch("xyzabc", candidates)).toBe(null);
  });

  test("handles empty candidates", () => {
    expect(findBestFuzzyMatch("test", [])).toBe(null);
  });

  test("respects custom threshold", () => {
    const candidates = ["Topgolf"];
    expect(findBestFuzzyMatch("xyzabc", candidates, 0.6)).toBe(null);
    expect(findBestFuzzyMatch("tpglf", candidates, 0.8)).toBe("Topgolf");
  });
});
