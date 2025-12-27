import { addDays, subDays } from "date-fns"

export type Member = {
  id: string
  name: string
  email: string
  phone: string
  status: "active" | "inactive" | "suspended"
  joinDate: Date
  membershipType: "standard" | "premium"
}

export type Booking = {
  id: string
  memberId: string
  member: {
     name: string
     email: string
     phone: string
  }
  club: string
  location: string
  date: Date
  time: string
  players: number
  status: "pending" | "confirmed" | "rejected" | "cancelled"
  createdAt: Date
}

export type Staff = {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "staff"
  status: "active" | "inactive"
  lastActive: Date
}

export type FAQ = {
  id: string
  question: string
  answer: string
  category: "booking" | "membership" | "general"
  lastUpdated: Date
}

export type AuditLog = {
    id: string
    user: string
    action: string
    target: string // e.g., "Booking #123"
    details: string
    timestamp: Date
}

export const mockMembers: Member[] = [
  {
    id: "mem_1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+15551234567",
    status: "active",
    joinDate: new Date("2023-01-15"),
    membershipType: "premium"
  },
  {
    id: "mem_2",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+15559876543",
    status: "active",
    joinDate: new Date("2023-05-20"),
    membershipType: "standard"
  },
  {
    id: "mem_3",
    name: "Mike Johnson",
    email: "mike@example.com",
    phone: "+15555555555",
    status: "suspended",
    joinDate: new Date("2023-03-10"),
    membershipType: "standard"
  }
]

export const mockBookings: Booking[] = [
  {
    id: "bk_1",
    memberId: "mem_1",
    member: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+15551234567"
    },
    club: "Pine Valley",
    location: "Bay 1",
    date: addDays(new Date(), 1),
    time: "10:00 AM",
    players: 4,
    status: "pending",
    createdAt: subDays(new Date(), 1)
  },
  {
    id: "bk_2",
    memberId: "mem_2",
    member: {
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+15559876543"
    },
    club: "Augusta National",
    location: "Bay 3",
    date: addDays(new Date(), 2),
    time: "02:00 PM",
    players: 2,
    status: "confirmed",
    createdAt: subDays(new Date(), 2)
  },
  {
    id: "bk_3",
    memberId: "mem_3",
    member: {
      name: "Mike Johnson",
      email: "mike@example.com",
      phone: "+15555555555"
    },
    club: "St Andrews",
    location: "Bay 2",
    date: subDays(new Date(), 1),
    time: "09:00 AM",
    players: 3,
    status: "rejected",
    createdAt: subDays(new Date(), 3)
  }
]

export const mockStaff: Staff[] = [
    {
        id: "st_1",
        name: "Admin User",
        email: "admin@syndicate.com",
        role: "admin",
        status: "active",
        lastActive: new Date()
    },
    {
        id: "st_2",
        name: "Club Manager",
        email: "manager@syndicate.com",
        role: "manager",
        status: "active",
        lastActive: subDays(new Date(), 1)
    }
]

export const mockFAQs: FAQ[] = [
    {
        id: "faq_1",
        question: "How do I book a tee time?",
        answer: "You can book a tee time by sending a message to our WhatsApp bot with your desired date and time.",
        category: "booking",
        lastUpdated: subDays(new Date(), 5)
    },
    {
        id: "faq_2",
        question: "What are the opening hours?",
        answer: "We are open from 6:00 AM to 10:00 PM daily.",
        category: "general",
        lastUpdated: subDays(new Date(), 10)
    }
]

export const mockAuditLogs: AuditLog[] = [
    {
        id: "log_1",
        user: "Admin User",
        action: "Updated Booking",
        target: "Booking #bk_1",
        details: "Changed status to Pending",
        timestamp: new Date()
    },
    {
        id: "log_2",
        user: "Club Manager",
        action: "Created Staff",
        target: "Jane Doe",
        details: "Added new staff member",
        timestamp: subDays(new Date(), 1)
    },
    {
        id: "log_3",
        user: "System",
        action: "Sync",
        target: "Bookings Database",
        details: "Automatic sync completed",
        timestamp: subDays(new Date(), 2)
    }
]
