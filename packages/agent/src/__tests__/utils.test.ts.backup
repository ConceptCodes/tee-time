import { describe, expect, test } from "bun:test";
import {
  isConfirmationMessage,
  isNegativeReply,
  looksLikeFollowup,
  normalizeMatchValue,
} from "../utils";

describe("isConfirmationMessage", () => {
  test("returns true for common confirmations", () => {
    expect(isConfirmationMessage("yes")).toBe(true);
    expect(isConfirmationMessage("Yes")).toBe(true);
    expect(isConfirmationMessage("yep")).toBe(true);
    expect(isConfirmationMessage("ok")).toBe(true);
    expect(isConfirmationMessage("okay")).toBe(true);
    expect(isConfirmationMessage("confirm")).toBe(true);
    expect(isConfirmationMessage("sounds good")).toBe(true);
    expect(isConfirmationMessage("looks good")).toBe(true);
    expect(isConfirmationMessage("that works")).toBe(true);
  });

  test("returns false for messages with numbers", () => {
    expect(isConfirmationMessage("2")).toBe(false);
    expect(isConfirmationMessage("yes 2")).toBe(false);
    expect(isConfirmationMessage("123")).toBe(false);
  });

  test("returns false for edit intent messages", () => {
    expect(isConfirmationMessage("change")).toBe(false);
    expect(isConfirmationMessage("actually")).toBe(false);
    expect(isConfirmationMessage("instead")).toBe(false);
  });

  test("returns false for long messages", () => {
    expect(
      isConfirmationMessage("yes I would like to confirm this booking please")
    ).toBe(false);
  });

  test("returns false for empty messages", () => {
    expect(isConfirmationMessage("")).toBe(false);
    expect(isConfirmationMessage("   ")).toBe(false);
  });
});

describe("isNegativeReply", () => {
  test("returns true for common negative responses", () => {
    expect(isNegativeReply("no")).toBe(true);
    expect(isNegativeReply("No")).toBe(true);
    expect(isNegativeReply("nope")).toBe(true);
    expect(isNegativeReply("nah")).toBe(true);
    expect(isNegativeReply("not now")).toBe(true);
    expect(isNegativeReply("maybe later")).toBe(true);
  });

  test("returns false for long messages", () => {
    expect(isNegativeReply("no I don't want to book a tee time")).toBe(false);
  });

  test("returns false for empty messages", () => {
    expect(isNegativeReply("")).toBe(false);
  });
});

describe("looksLikeFollowup", () => {
  test("returns true for short answers without intent keywords", () => {
    expect(looksLikeFollowup("Topgolf")).toBe(true);
    expect(looksLikeFollowup("Dallas")).toBe(true);
    expect(looksLikeFollowup("2pm")).toBe(true);
    expect(looksLikeFollowup("tomorrow")).toBe(true);
  });

  test("returns false for messages with booking intent", () => {
    expect(looksLikeFollowup("book a tee time")).toBe(false);
    expect(looksLikeFollowup("cancel my booking")).toBe(false);
    expect(looksLikeFollowup("check status")).toBe(false);
    expect(looksLikeFollowup("help me")).toBe(false);
  });

  test("returns false for long messages (over 32 chars)", () => {
    expect(looksLikeFollowup("this is a very long message that exceeds limit")).toBe(false);
  });
});

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
