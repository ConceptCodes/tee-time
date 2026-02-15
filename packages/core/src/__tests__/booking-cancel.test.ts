import { describe, expect, test, beforeEach } from "bun:test";
import { cancelBookingWithHistory } from "../booking-cancel";
import { setBookingStatusWithHistory } from "../booking-status";
import { notifyBooking } from "../notifications/slack";
import { jest } from "bun:test";

jest.mock("../booking-status", () => ({
  setBookingStatusWithHistory: jest.fn(),
}));
jest.mock("../notifications/slack", () => ({
  notifyBooking: jest.fn(),
}));

describe("cancelBookingWithHistory", () => {
  const mockDb = {} as any;
  const mockNow = new Date("2026-02-05T12:00:00Z");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("cancels booking with history", async () => {
    const mockBooking = {
      id: "booking_123",
      clubId: "club_456",
      preferredDate: "2026-02-10",
      preferredTimeStart: "14:00",
      preferredTimeEnd: "16:00",
    };

    (setBookingStatusWithHistory as any).mockResolvedValue({
      booking: mockBooking,
      history: { id: "history_123" },
    });

    const result = await cancelBookingWithHistory(mockDb, {
      bookingId: "booking_123",
      memberId: "member_789",
      reason: "Customer request",
      now: mockNow,
    });

    expect(setBookingStatusWithHistory).toHaveBeenCalledWith(mockDb, {
      bookingId: "booking_123",
      nextStatus: "Cancelled",
      changedByStaffId: null,
      reason: "Customer request",
      cancelledAt: mockNow,
      audit: {
        actorId: null,
        action: "booking.cancel",
        metadata: { memberId: "member_789" },
      },
    });

    expect(result.booking).toEqual(mockBooking);
  });

  test("returns null when booking not found", async () => {
    (setBookingStatusWithHistory as any).mockResolvedValue({
      booking: null,
      history: null,
    });

    const result = await cancelBookingWithHistory(mockDb, {
      bookingId: "nonexistent",
      memberId: "member_789",
    });

    expect(result.booking).toBeNull();
    expect(result.history).toBeNull();
  });

  test("includes staff member in audit when provided", async () => {
    (setBookingStatusWithHistory as any).mockResolvedValue({
      booking: { id: "booking_123", clubId: "club_456" },
      history: { id: "history_123" },
    });

    await cancelBookingWithHistory(mockDb, {
      bookingId: "booking_123",
      memberId: "member_789",
      staffMemberId: "staff_abc",
    });

    expect(setBookingStatusWithHistory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        changedByStaffId: "staff_abc",
        audit: expect.objectContaining({
          actorId: "staff_abc",
        }),
      })
    );
  });
});
