import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import {
  ApiResponse,
  AuditLog,
  Booking,
  Club,
  ClubLocation,
  FAQ,
  MemberProfile,
  PaginatedResponse,
  MessageLog,
  OverviewResponse,
  OverviewUiData,
  SupportRequest,
  StaffUser,
  toAuditLog,
  toBooking,
  toClub,
  toClubLocation,
  toFAQ,
  toMemberProfile,
  toMessageLog,
  toSupportRequest,
  toStaffUser,
} from "@/lib/api-types"
import type { BookingFormValues } from "@/lib/booking-form"

export const useMembers = () =>
  useQuery({
    queryKey: queryKeys.members(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<MemberProfile>>(
        "/api/members?limit=200"
      )
      return response.data.map(toMemberProfile)
    },
  })

export const useMember = (id?: string) =>
  useQuery({
    queryKey: queryKeys.member(id),
    queryFn: async () => {
      const response = await apiGet<ApiResponse<MemberProfile>>(`/api/members/${id}`)
      return toMemberProfile(response.data)
    },
    enabled: Boolean(id),
  })

export const useBookings = () =>
  useQuery({
    queryKey: queryKeys.bookings(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<Booking>>(
        "/api/bookings?limit=200"
      )
      return response.data.map(toBooking)
    },
  })

export const useBooking = (id?: string) =>
  useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: async () => {
      const response = await apiGet<ApiResponse<Booking>>(`/api/bookings/${id}`)
      return toBooking(response.data)
    },
    enabled: Boolean(id),
  })

export const useClubs = () =>
  useQuery({
    queryKey: queryKeys.clubs(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<Club>>("/api/clubs?limit=200")
      return response.data.map(toClub)
    },
  })

export const useClubLocations = (clubIds: string[]) =>
  useQuery({
    queryKey: queryKeys.clubLocations(clubIds),
    queryFn: async () => {
      if (clubIds.length === 0) return [] as ClubLocation[]
      const responses = await Promise.all(
        clubIds.map((clubId) =>
          apiGet<PaginatedResponse<ClubLocation>>(
            `/api/clubs/${clubId}/locations?limit=200`
          )
        )
      )
      return responses.flatMap((res) => res.data.map(toClubLocation))
    },
    enabled: clubIds.length > 0,
  })

export const useStaff = () =>
  useQuery({
    queryKey: queryKeys.staff(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<StaffUser>>(
        "/api/staff-users?limit=200"
      )
      return response.data.map(toStaffUser)
    },
  })

export const useFaqs = () =>
  useQuery({
    queryKey: queryKeys.faqs(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<FAQ>>("/api/faqs?limit=200")
      return response.data.map(toFAQ)
    },
  })

export const useAuditLogs = () =>
  useQuery({
    queryKey: queryKeys.auditLogs(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<AuditLog>>(
        "/api/audit-logs?limit=200"
      )
      return response.data.map(toAuditLog)
    },
  })

export const useMessageLogs = () =>
  useQuery({
    queryKey: queryKeys.messageLogs(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<MessageLog>>(
        "/api/message-logs?limit=200"
      )
      return response.data.map(toMessageLog)
    },
  })

export const useSupportRequests = (status?: string) =>
  useQuery({
    queryKey: queryKeys.supportRequests(status),
    queryFn: async () => {
      const query = status ? `?status=${status}&limit=200` : "?limit=200"
      const response = await apiGet<PaginatedResponse<SupportRequest>>(
        `/api/support-requests${query}`
      )
      return response.data.map(toSupportRequest)
    },
  })

export const useOverviewUi = (params?: {
  lookbackDays?: number
  upcomingLimit?: number
}) =>
  useQuery({
    queryKey: queryKeys.overview(params?.lookbackDays, params?.upcomingLimit),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.lookbackDays) {
        searchParams.set("lookbackDays", String(params.lookbackDays))
      }
      if (params?.upcomingLimit) {
        searchParams.set("upcomingLimit", String(params.upcomingLimit))
      }
      const query = searchParams.toString()
      const response = await apiGet<ApiResponse<OverviewResponse>>(
        `/api/admin/overview${query ? `?${query}` : ""}`
      )
      return response.data.ui as OverviewUiData
    },
  })

export const useCreateBooking = (options?: {
  onSuccess?: (booking: Booking) => void
  onError?: (error: unknown) => void
}) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: BookingFormValues) => {
      const response = await apiPost<ApiResponse<Booking>>("/api/bookings", values)
      return toBooking(response.data)
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() })
      options?.onSuccess?.(booking)
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })
}

export const useUpdateFaq = (options?: {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FAQ> }) => {
      await apiPut(`/api/faqs/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs() })
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })
}
