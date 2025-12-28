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
    phoneNumber: "+447712345678",
    timezone: "Europe/London",
    favoriteLocationLabel: "Wentworth",
    favoriteLocationPoint: { x: -0.60, y: 51.39 },
    preferredLocationLabel: "West Course",
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
    phoneNumber: "+447812345678",
    timezone: "Europe/London",
    favoriteLocationLabel: "Sunningdale",
    favoriteLocationPoint: { x: -0.63, y: 51.39 },
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
    phoneNumber: "+447912345678",
    timezone: "Europe/London",
    favoriteLocationLabel: "Royal Birkdale",
    membershipId: "MEM-2219",
    preferredLocationLabel: "Championship Course",
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
    clubName: "Wentworth Club",
    clubLocationName: "West Course",
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
    clubName: "Sunningdale Golf Club",
    clubLocationName: "Old Course",
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
    clubName: "Royal Birkdale",
    clubLocationName: "Championship Course",
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
    name: "Wentworth Club",
    isActive: true,
    createdAt: subDays(new Date(), 240),
    updatedAt: subDays(new Date(), 10),
  },
  {
    id: "club_2",
    name: "Sunningdale Golf Club",
    isActive: true,
    createdAt: subDays(new Date(), 210),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: "club_3",
    name: "Royal Birkdale",
    isActive: true,
    createdAt: subDays(new Date(), 190),
    updatedAt: subDays(new Date(), 20),
  },
  {
    id: "club_4",
    name: "St Andrews Links",
    isActive: true,
    createdAt: subDays(new Date(), 300),
    updatedAt: subDays(new Date(), 5),
  },
  {
    id: "club_5",
    name: "Royal St George's",
    isActive: true,
    createdAt: subDays(new Date(), 150),
    updatedAt: subDays(new Date(), 12),
  },
  {
    id: "club_6",
    name: "Royal Portrush",
    isActive: false,
    createdAt: subDays(new Date(), 180),
    updatedAt: subDays(new Date(), 8),
  },
  {
    id: "club_7",
    name: "The Belfry",
    isActive: true,
    createdAt: subDays(new Date(), 220),
    updatedAt: subDays(new Date(), 15),
  },
  {
    id: "club_8",
    name: "Gleneagles",
    isActive: false,
    createdAt: subDays(new Date(), 250),
    updatedAt: subDays(new Date(), 4),
  },
]

export const mockClubLocations: ClubLocation[] = [
  {
    id: "loc_1",
    clubId: "club_1",
    name: "West Course",
    address: "Wentworth Dr, Virginia Water GU25 4LS, UK",
    locationPoint: { x: -0.60, y: 51.39 },
    isActive: true,
    createdAt: subDays(new Date(), 200),
    updatedAt: subDays(new Date(), 12),
  },
  {
    id: "loc_2",
    clubId: "club_2",
    name: "Old Course",
    address: "Ridgemount Rd, Sunningdale, Ascot SL5 9RR, UK",
    locationPoint: { x: -0.63, y: 51.39 },
    isActive: true,
    createdAt: subDays(new Date(), 180),
    updatedAt: subDays(new Date(), 9),
  },
  {
    id: "loc_3",
    clubId: "club_3",
    name: "Championship Course",
    address: "Waterloo Rd, Southport PR8 2LX, UK",
    locationPoint: { x: -3.03, y: 53.62 },
    isActive: true,
    createdAt: subDays(new Date(), 170),
    updatedAt: subDays(new Date(), 15),
  },
  {
    id: "loc_4",
    clubId: "club_4",
    name: "Old Course",
    address: "West Sands Rd, St Andrews KY16 9XL, UK",
    locationPoint: { x: -2.80, y: 56.34 },
    isActive: true,
    createdAt: subDays(new Date(), 280),
    updatedAt: subDays(new Date(), 4),
  },
  {
    id: "loc_5",
    clubId: "club_5",
    name: "Championship Course",
    address: "Sandwich CT13 9PB, UK",
    locationPoint: { x: 1.36, y: 51.27 },
    isActive: true,
    createdAt: subDays(new Date(), 140),
    updatedAt: subDays(new Date(), 10),
  },
  {
    id: "loc_6",
    clubId: "club_6",
    name: "Dunluce Links",
    address: "Dunluce Rd, Portrush BT56 8JQ, UK",
    locationPoint: { x: -6.63, y: 55.20 },
    isActive: false,
    createdAt: subDays(new Date(), 170),
    updatedAt: subDays(new Date(), 6),
  },
  {
    id: "loc_7",
    clubId: "club_7",
    name: "Brabazon Course",
    address: "Lichfield Rd, Wishaw, Sutton Coldfield B76 9PR, UK",
    locationPoint: { x: -1.74, y: 52.55 },
    isActive: true,
    createdAt: subDays(new Date(), 210),
    updatedAt: subDays(new Date(), 14),
  },
  {
    id: "loc_8",
    clubId: "club_8",
    name: "King's Course",
    address: "Auchterarder PH3 1NF, UK",
    locationPoint: { x: -3.75, y: 56.28 },
    isActive: false,
    createdAt: subDays(new Date(), 240),
    updatedAt: subDays(new Date(), 3),
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
