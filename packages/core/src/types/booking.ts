export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Not Available"
  | "Cancelled"
  | "Follow-up required";

export interface Booking {
  id: string;
  memberId: string;
  clubId: string;
  clubLocationId?: string | null;
  bayId?: string | null;
  preferredDate: string;
  preferredTimeStart: string;
  preferredTimeEnd?: string | null;
  bookingReference: string;
  numberOfPlayers: number;
  guestNames: string;
  notes: string;
  status: BookingStatus;
  staffMemberId?: string | null;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  clubName?: string;
  clubLocationName?: string;
  bayLabel?: string;
}
