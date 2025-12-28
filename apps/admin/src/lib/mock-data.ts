import { addDays, format, subDays } from "date-fns"

export type StaffUser = {
  id: string
  authUserId: string
  email: string
  name: string
  role: "admin" | "staff" | "member"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastActiveAt?: Date
}

export type MemberProfile = {
  id: string
  phoneNumber: string
  name: string
  timezone: string
  favoriteLocationLabel: string
  favoriteLocationPoint?: { x: number; y: number }
  preferredLocationLabel?: string
  preferredTimeOfDay?: string
  preferredBayLabel?: string
  membershipId: string
  onboardingCompletedAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Not Available"
  | "Cancelled"
  | "Follow-up required"

export type Booking = {
  id: string
  memberId: string
  clubId: string
  clubLocationId?: string
  bayId?: string
  preferredDate: string
  preferredTimeStart: string
  preferredTimeEnd?: string
  numberOfPlayers: number
  guestNames: string
  notes: string
  status: BookingStatus
  staffMemberId?: string
  cancelledAt?: string
  createdAt: Date
  updatedAt: Date
  clubName?: string
  clubLocationName?: string
  bayLabel?: string
}

export type FAQ = {
  id: string
  question: string
  answer: string
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type Club = {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type ClubLocation = {
  id: string
  clubId: string
  name: string
  address: string
  locationPoint: { x: number; y: number }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type AuditLog = {
  id: string
  user: string
  action: string
  target: string
  details: string
  timestamp: Date
}

export const mockStaff: StaffUser[] = [
  {
    id: "st_1",
    authUserId: "auth_001",
    name: "Admin User",
    email: "admin@tee-time.com",
    role: "admin",
    isActive: true,
    createdAt: subDays(new Date(), 180),
    updatedAt: subDays(new Date(), 2),
    lastActiveAt: new Date(),
  },
  {
    id: "st_2",
    authUserId: "auth_002",
    name: "Support Lead",
    email: "support@tee-time.com",
    role: "staff",
    isActive: true,
    createdAt: subDays(new Date(), 120),
    updatedAt: subDays(new Date(), 4),
    lastActiveAt: subDays(new Date(), 1),
  },
]

export const mockMembers: MemberProfile[] = [
  {
    id: "mem_1",
    name: "John Doe",
    phoneNumber: "+15551234567",
    timezone: "America/New_York",
    favoriteLocationLabel: "Pine Valley",
    favoriteLocationPoint: { x: -74.51, y: 40.09 },
    preferredLocationLabel: "North Bay",
    preferredTimeOfDay: "Morning",
    preferredBayLabel: "Bay 3",
    membershipId: "MEM-4832",
    onboardingCompletedAt: subDays(new Date(), 130),
    isActive: true,
    createdAt: subDays(new Date(), 150),
    updatedAt: subDays(new Date(), 5),
  },
  {
    id: "mem_2",
    name: "Jane Smith",
    phoneNumber: "+15559876543",
    timezone: "America/Chicago",
    favoriteLocationLabel: "Augusta National",
    favoriteLocationPoint: { x: -82.04, y: 33.5 },
    preferredTimeOfDay: "Afternoon",
    membershipId: "MEM-9301",
    onboardingCompletedAt: subDays(new Date(), 80),
    isActive: true,
    createdAt: subDays(new Date(), 110),
    updatedAt: subDays(new Date(), 2),
  },
  {
    id: "mem_3",
    name: "Mike Johnson",
    phoneNumber: "+15555555555",
    timezone: "America/Los_Angeles",
    favoriteLocationLabel: "St Andrews",
    membershipId: "MEM-2219",
    preferredLocationLabel: "West Course",
    preferredBayLabel: "Bay 2",
    isActive: false,
    createdAt: subDays(new Date(), 90),
    updatedAt: subDays(new Date(), 12),
  },
]

export const mockBookings: Booking[] = [
  {
    id: "bk_1",
    memberId: "mem_1",
    clubId: "club_1",
    clubLocationId: "loc_1",
    bayId: "bay_3",
    preferredDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    preferredTimeStart: "10:00",
    preferredTimeEnd: "11:00",
    numberOfPlayers: 4,
    guestNames: "Sam, Priya, Liam",
    notes: "Prefer a quiet bay.",
    status: "Pending",
    staffMemberId: "st_2",
    createdAt: subDays(new Date(), 1),
    updatedAt: subDays(new Date(), 1),
    clubName: "Pine Valley",
    clubLocationName: "North Bay",
    bayLabel: "Bay 3",
  },
  {
    id: "bk_2",
    memberId: "mem_2",
    clubId: "club_2",
    clubLocationId: "loc_2",
    bayId: "bay_6",
    preferredDate: format(addDays(new Date(), 2), "yyyy-MM-dd"),
    preferredTimeStart: "14:00",
    numberOfPlayers: 2,
    guestNames: "Alex",
    notes: "Walking only.",
    status: "Confirmed",
    staffMemberId: "st_1",
    createdAt: subDays(new Date(), 2),
    updatedAt: subDays(new Date(), 1),
    clubName: "Augusta National",
    clubLocationName: "Main Course",
    bayLabel: "Bay 6",
  },
  {
    id: "bk_3",
    memberId: "mem_3",
    clubId: "club_3",
    clubLocationId: "loc_3",
    preferredDate: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    preferredTimeStart: "09:00",
    numberOfPlayers: 3,
    guestNames: "Casey, Drew",
    notes: "Need cart availability.",
    status: "Not Available",
    createdAt: subDays(new Date(), 3),
    updatedAt: subDays(new Date(), 2),
    clubName: "St Andrews",
    clubLocationName: "West Course",
  },
]

export const mockFAQs: FAQ[] = [
  {
    id: "faq_1",
    question: "How do I book a tee time?",
    answer:
      "Send a WhatsApp message with your date, time, and player count. We'll confirm availability.",
    tags: ["booking", "intake"],
    isActive: true,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 5),
  },
  {
    id: "faq_2",
    question: "What are the opening hours?",
    answer: "We are open from 6:00 AM to 10:00 PM daily.",
    tags: ["general"],
    isActive: true,
    createdAt: subDays(new Date(), 45),
    updatedAt: subDays(new Date(), 10),
  },
]

export const mockClubs: Club[] = [
  {
    id: "club_1",
    name: "Tee Time National",
    isActive: true,
    createdAt: subDays(new Date(), 240),
    updatedAt: subDays(new Date(), 10),
  },
  {
    id: "club_2",
    name: "Cypress Ridge",
    isActive: true,
    createdAt: subDays(new Date(), 210),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: "club_3",
    name: "South Bay Club",
    isActive: false,
    createdAt: subDays(new Date(), 190),
    updatedAt: subDays(new Date(), 20),
  },
]

export const mockClubLocations: ClubLocation[] = [
  {
    id: "loc_1",
    clubId: "club_1",
    name: "North Bay",
    address: "12 Pine Valley Dr, NJ",
    locationPoint: { x: -74.5, y: 40.08 },
    isActive: true,
    createdAt: subDays(new Date(), 200),
    updatedAt: subDays(new Date(), 12),
  },
  {
    id: "loc_2",
    clubId: "club_2",
    name: "Main Course",
    address: "88 Magnolia Ave, GA",
    locationPoint: { x: -82.03, y: 33.49 },
    isActive: true,
    createdAt: subDays(new Date(), 180),
    updatedAt: subDays(new Date(), 9),
  },
  {
    id: "loc_3",
    clubId: "club_3",
    name: "West Course",
    address: "1 Links Rd, Scotland",
    locationPoint: { x: -2.8, y: 56.34 },
    isActive: false,
    createdAt: subDays(new Date(), 170),
    updatedAt: subDays(new Date(), 15),
  },
]

export const mockAuditLogs: AuditLog[] = [
  {
    id: "log_1",
    user: "Admin User",
    action: "booking.confirm",
    target: "Booking #bk_2",
    details: "Confirmed booking after availability check.",
    timestamp: new Date(),
  },
  {
    id: "log_2",
    user: "Support Lead",
    action: "staff.create",
    target: "Support Lead",
    details: "Added new staff member",
    timestamp: subDays(new Date(), 1),
  },
  {
    id: "log_3",
    user: "System",
    action: "sync.run",
    target: "Bookings Database",
    details: "Automatic sync completed",
    timestamp: subDays(new Date(), 2),
  },
]
