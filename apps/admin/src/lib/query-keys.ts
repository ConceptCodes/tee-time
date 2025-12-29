export const queryKeys = {
  bookings: () => ["bookings"] as const,
  booking: (id?: string) => ["booking", id] as const,
  members: () => ["members"] as const,
  member: (id?: string) => ["member", id] as const,
  clubs: () => ["clubs"] as const,
  clubLocations: (clubIds: string[]) => ["clubLocations", clubIds] as const,
  staff: () => ["staff"] as const,
  faqs: () => ["faqs"] as const,
  auditLogs: () => ["auditLogs"] as const,
  messageLogs: () => ["messageLogs"] as const,
  supportRequests: (status?: string) => ["supportRequests", status] as const,
  overview: (lookbackDays?: number, upcomingLimit?: number) =>
    ["overview", lookbackDays, upcomingLimit] as const,
  reports: (period: string) => ["reports", period] as const,
} as const
