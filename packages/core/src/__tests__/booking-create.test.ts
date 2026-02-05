import { createBookingWithHistory } from "../booking-create";
import { BookingInPastError, BookingTooSoonError } from "../errors";

jest.mock("@tee-time/database", () => ({
  createBookingRepository: jest.fn(() => ({
    create: jest.fn(),
  })),
  createBookingStatusHistoryRepository: jest.fn(() => ({
    create: jest.fn(),
  })),
  createClubLocationBayRepository: jest.fn(() => ({
    listByLocationId: jest.fn(),
    reserve: jest.fn(),
  })),
}));

describe("createBookingWithHistory", () => {
  const mockDb = {
    transaction: jest.fn((fn) => fn(mockDb)),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws BookingInPastError for past dates", async () => {
    const pastDate = new Date("2020-01-01");
    const now = new Date("2026-02-05T12:00:00Z");

    await expect(
      createBookingWithHistory(mockDb, {
        memberId: "member_123",
        clubId: "club_456",
        preferredDate: pastDate,
        preferredTimeStart: "14:00",
        numberOfPlayers: 2,
        guestNames: "",
        notes: "",
        now,
      })
    ).rejects.toThrow(BookingInPastError);
  });

  it("throws BookingTooSoonError when within lead time", async () => {
    process.env.BOOKING_MIN_LEAD_MINUTES = "60";
    const now = new Date("2026-02-05T12:00:00Z");
    const tooSoonDate = new Date("2026-02-05T12:30:00Z");

    await expect(
      createBookingWithHistory(mockDb, {
        memberId: "member_123",
        clubId: "club_456",
        preferredDate: tooSoonDate,
        preferredTimeStart: "12:30",
        numberOfPlayers: 2,
        guestNames: "",
        notes: "",
        now,
      })
    ).rejects.toThrow(BookingTooSoonError);

    delete process.env.BOOKING_MIN_LEAD_MINUTES;
  });

  it("generates valid booking reference", async () => {
    const { createBookingRepository } = require("@tee-time/database");
    const mockCreate = jest.fn().mockResolvedValue({
      id: "booking_123",
      memberId: "member_123",
      bookingReference: "TT-TEST01",
    });
    createBookingRepository.mockReturnValue({ create: mockCreate });

    const futureDate = new Date("2026-12-25");

    await createBookingWithHistory(mockDb, {
      memberId: "member_123",
      clubId: "club_456",
      preferredDate: futureDate,
      preferredTimeStart: "14:00",
      numberOfPlayers: 2,
      guestNames: "Alice, Bob",
      notes: "Test booking",
    });

    expect(mockCreate).toHaveBeenCalled();
    const createdBooking = mockCreate.mock.calls[0][0];
    expect(createdBooking.bookingReference).toMatch(/^TT-[A-Z0-9]{6}$/);
  });

  it("creates booking with status history", async () => {
    const { createBookingRepository, createBookingStatusHistoryRepository } =
      require("@tee-time/database");

    const mockBooking = {
      id: "booking_123",
      memberId: "member_123",
      status: "Pending",
    };
    createBookingRepository.mockReturnValue({
      create: jest.fn().mockResolvedValue(mockBooking),
    });
    createBookingStatusHistoryRepository.mockReturnValue({
      create: jest.fn().mockResolvedValue({ id: "history_123" }),
    });

    const futureDate = new Date("2026-12-25");

    const result = await createBookingWithHistory(mockDb, {
      memberId: "member_123",
      clubId: "club_456",
      preferredDate: futureDate,
      preferredTimeStart: "14:00",
      numberOfPlayers: 2,
      guestNames: "",
      notes: "",
    });

    expect(result.booking).toEqual(mockBooking);
  });
});
