import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import {
  ApiResponse,
  BookingTrend,
  ClubBooking,
  ConversionData,
  RequestMixData,
  AutomationTrendData,
  ConversionResponseTrendData,
  ResponseTimeData,
  MemberActivityData,
} from "@/lib/api-types"


export const useResponseTime = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "response-time"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<ResponseTimeData>>(
        `/api/reports/response-time?period=${period}`
      )
      return response.data
    },
  })

export const useMemberActivity = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "member-activity"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<MemberActivityData>>(
        `/api/reports/member-activity?period=${period}`
      )
      return response.data
    },
  })

export const useBookingTrend = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "booking-trend"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<BookingTrend[]>>(
        `/api/reports/booking-trend?period=${period}&groupBy=day`
      )
      return response.data
    },
  })

export const useClubBookings = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "bookings-by-club"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<ClubBooking[]>>(
        `/api/reports/bookings-by-club?period=${period}`
      )
      return response.data
    },
  })

export const useConversionRate = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "conversion-rate"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<ConversionData>>(
        `/api/reports/conversion-rate?period=${period}`
      )
      return response.data
    },
  })

export const useRequestMix = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "request-mix"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<RequestMixData[]>>(
        `/api/reports/request-mix?period=${period}`
      )
      return response.data
    },
  })

export const useAutomationTrend = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "automation-trend"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<AutomationTrendData[]>>(
        `/api/reports/automation-trend?period=${period}`
      )
      return response.data
    },
  })

export const useConversionTrend = (period: string) =>
  useQuery({
    queryKey: [...queryKeys.reports(period), "conversion-trend"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<ConversionResponseTrendData[]>>(
        `/api/reports/conversion-trend?period=${period}`
      )
      return response.data
    },
  })
