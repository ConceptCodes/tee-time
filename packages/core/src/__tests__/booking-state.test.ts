import { describe, expect, test } from "bun:test";
import {
  extractSharedContext,
  wrapFlowState,
  type SharedBookingContext
} from "../booking-state";

describe("booking state shared context", () => {
  test("extracts shared context from flow envelope", () => {
    const shared: SharedBookingContext = {
      club: "Topgolf",
      preferredDate: "2025-01-01",
      preferredTime: "14:00",
      players: 2
    };
    const wrapped = wrapFlowState("booking-new", { club: "Topgolf" }, shared);
    const extracted = extractSharedContext(wrapped);
    expect(extracted).toEqual(shared);
  });

  test("extracts shared context from legacy state object", () => {
    const shared: SharedBookingContext = {
      clubLocation: "Dallas",
      bayLabel: "Bay 1"
    };
    const legacyState = {
      club: "Topgolf",
      sharedBookingContext: shared
    };
    const extracted = extractSharedContext(legacyState);
    expect(extracted).toEqual(shared);
  });
});
