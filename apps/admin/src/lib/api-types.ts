export type PaginationMeta = {
  limit: number
  offset: number
  total?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: PaginationMeta
}

export type ApiResponse<T> = {
  data: T
}

type DateInput = string | Date

const parseDate = (value?: DateInput | null) =>
  value ? new Date(value) : undefined

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

type StaffUserApi = Omit<StaffUser, "createdAt" | "updatedAt" | "lastActiveAt"> & {
  createdAt: DateInput
  updatedAt: DateInput
  lastActiveAt?: DateInput | null
}

export const toStaffUser = (input: StaffUserApi): StaffUser => ({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
  lastActiveAt: parseDate(input.lastActiveAt),
})

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

type MemberProfileApi = Omit<
  MemberProfile,
  "createdAt" | "updatedAt" | "onboardingCompletedAt"
> & {
  createdAt: DateInput
  updatedAt: DateInput
  onboardingCompletedAt?: DateInput | null
}

export const toMemberProfile = (input: MemberProfileApi): MemberProfile => ({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
  onboardingCompletedAt: parseDate(input.onboardingCompletedAt),
})

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
  clubLocationId?: string | null
  bayId?: string | null
  preferredDate: string
  preferredTimeStart: string
  preferredTimeEnd?: string | null
  bookingReference: string
  numberOfPlayers: number
  guestNames: string
  notes: string
  status: BookingStatus
  staffMemberId?: string | null
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
  clubName?: string
  clubLocationName?: string
  bayLabel?: string
}

type BookingApi = Omit<Booking, "createdAt" | "updatedAt" | "cancelledAt"> & {
  createdAt: DateInput
  updatedAt: DateInput
  cancelledAt?: DateInput | null
}

export const toBooking = (input: BookingApi): Booking => ({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
  cancelledAt: parseDate(input.cancelledAt),
})

export type FAQ = {
  id: string
  question: string
  answer: string
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type FAQApi = Omit<FAQ, "createdAt" | "updatedAt"> & {
  createdAt: DateInput
  updatedAt: DateInput
}

export const toFAQ = (input: FAQApi): FAQ => ({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
})

export type Club = {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type ClubApi = Omit<Club, "createdAt" | "updatedAt"> & {
  createdAt: DateInput
  updatedAt: DateInput
}

export const toClub = (input: ClubApi): Club => ({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
})

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

type ClubLocationApi = Omit<ClubLocation, "createdAt" | "updatedAt"> & {
  createdAt: DateInput
  updatedAt: DateInput
}

export const toClubLocation = (input: ClubLocationApi): ClubLocation => ({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
})

export type AuditLog = {
  id: string
  actorId?: string | null
  action: string
  resourceType: string
  resourceId: string
  metadata: Record<string, unknown>
  createdAt: Date
}

type AuditLogApi = Omit<AuditLog, "createdAt"> & {
  createdAt: DateInput
}

export const toAuditLog = (input: AuditLogApi): AuditLog => ({
  ...input,
  createdAt: new Date(input.createdAt),
})

export type MessageLog = {
  id: string
  memberId: string
  direction: "inbound" | "outbound"
  channel: "whatsapp" | "slack" | "email"
  providerMessageId?: string | null
  bodyRedacted: string
  metadata: Record<string, unknown>
  createdAt: Date
}

type MessageLogApi = Omit<MessageLog, "createdAt"> & {
  createdAt: DateInput
}

export const toMessageLog = (input: MessageLogApi): MessageLog => ({
  ...input,
  createdAt: new Date(input.createdAt),
})

export type SupportRequest = {
  id: string
  memberId: string
  message: string
  status: string
  createdAt: Date
  resolvedAt?: Date
}

type SupportRequestApi = Omit<SupportRequest, "createdAt" | "resolvedAt"> & {
  createdAt: DateInput
  resolvedAt?: DateInput | null
}

export const toSupportRequest = (input: SupportRequestApi): SupportRequest => ({
  ...input,
  createdAt: new Date(input.createdAt),
  resolvedAt: parseDate(input.resolvedAt),
})

export type OverviewStatMetric = {
  value: number
  changePct: number
}

export type OverviewUpcomingBooking = {
  id: string
  preferredDate: string
  preferredTimeStart: string
  preferredTimeEnd?: string | null
  status: string
  numberOfPlayers: number
  memberName?: string | null
  clubName?: string | null
  locationName?: string | null
}

export type OverviewUiData = {
  lookbackDays: number
  stats: {
    bookingsToday: OverviewStatMetric
    pendingApprovals: OverviewStatMetric
    avgResponseTimeMinutes: OverviewStatMetric
    activeMembers: OverviewStatMetric
    automationRate: OverviewStatMetric
  }
  upcoming: OverviewUpcomingBooking[]
  pendingConfirmations: OverviewUpcomingBooking[]
  memberPulse: {
    vipResponseRate: number
    vipResponseChangePct: number
    newMemberInvites: number
    inviteChangePct: number
  }
}

export type OverviewResponse = {
  stats: unknown
  recentActivity: unknown
  ui: OverviewUiData
}

// Reports
export type ReportPeriod = "week" | "month" | "quarter" | "year"

export type BookingTrend = {
  period: string
  total: number
  confirmed: number
  pending: number
  conversionRate: number
}

export type ClubBooking = {
  clubId: string
  clubName: string
  total: number
  confirmed: number
  pending: number
  notAvailable: number
  cancelled: number
  conversionRate: number
}

export type ConversionData = {
  total: number
  confirmed: number
  notAvailable: number
  cancelled: number
  conversionRate: number
  lossRate: number
}

export type RequestMixData = {
  name: string
  value: number
}

export type AutomationTrendData = {
  period: string
  automated: number
  handoff: number
}

export type ConversionResponseTrendData = {
  period: string
  conversion: number
  response: number
}

export type ResponseTimeData = {
  averageMinutes: number
  averageHours: number
  sampleSize: number
  fastestMinutes: number
  slowestMinutes: number
}

export type MemberActivityData = {
  totalMembers: number
  avgBookingsPerMember: number
  repeatBookerCount: number
}
