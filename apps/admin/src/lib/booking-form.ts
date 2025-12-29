import { z } from "zod"

const MAX_PLAYERS = Number(import.meta.env.VITE_MAX_PLAYERS ?? 4) || 4

export const bookingSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  clubId: z.string().min(1, "Club is required"),
  preferredDate: z.string().min(1, "Date is required"),
  preferredTimeStart: z.string().min(1, "Time is required"),
  numberOfPlayers: z.number().min(1).max(MAX_PLAYERS),
  guestNames: z.string().min(1, "Guest names are required"),
  notes: z.string().min(1, "Notes are required"),
})

export type BookingFormValues = z.infer<typeof bookingSchema>
