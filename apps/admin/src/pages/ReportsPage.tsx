import { useState } from "react"
import DashboardTab from "@/pages/reports/DashboardTab"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

// Hooks
import {
  useBookingTrend,
  useClubBookings,
  useConversionRate,
  useRequestMix,
  useAutomationTrend,
  useConversionTrend,
} from "@/hooks/use-report-queries"

// Chart Components
import { BookingTrendChart } from "@/components/charts/BookingTrendChart"
import { BookingsByClubChart } from "@/components/charts/BookingsByClubChart"
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart"
import { ConversionResponseChart } from "@/components/charts/ConversionResponseChart"
import { AutomationMixChart } from "@/components/charts/AutomationMixChart"
import { RequestMixChart } from "@/components/charts/RequestMixChart"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export default function ReportsPage() {
  const [period, setPeriod] = useState("month")
  const queryClient = useQueryClient()
  
  // Data hooks
  const { data: rawBookingTrend = [], isLoading: trendLoading } = useBookingTrend(period)
  const { data: clubBookings = [], isLoading: clubLoading } = useClubBookings(period)
  const { data: conversionData, isLoading: conversionLoading } = useConversionRate(period)
  const { data: requestMix = [], isLoading: mixLoading } = useRequestMix(period)
  const { data: automationTrendTrend = [], isLoading: automationLoading } = useAutomationTrend(period)
  const { data: conversionTrendRaw = [], isLoading: conversionTrendLoading } = useConversionTrend(period)

  const loading = trendLoading || clubLoading || conversionLoading || mixLoading || automationLoading || conversionTrendLoading

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reports(period) })
  }

  const handleExport = async (type: "bookings" | "messages") => {
    const url = `/api/reports/export/${type}?format=csv`
    window.open(url, "_blank")
  }

  // Format booking trend
  const bookingTrend = rawBookingTrend.map((d) => ({
    ...d,
    period: new Date(d.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }))

  const statusPieData = conversionData ? [
    { name: "confirmed", value: conversionData.confirmed, fill: CHART_COLORS[1] },
    { name: "notAvailable", value: conversionData.notAvailable, fill: CHART_COLORS[2] },
    { name: "cancelled", value: conversionData.cancelled, fill: CHART_COLORS[3] },
    { name: "pending", value: conversionData.total - conversionData.confirmed - conversionData.notAvailable - conversionData.cancelled, fill: CHART_COLORS[4] },
  ].filter(d => d.value > 0) : []

  // Format request mix for chart
  const sourceMix = requestMix.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length]
  }))

  // Format automation trend
  const automationTrendFormatted = automationTrendTrend.map(d => ({
    ...d,
    week: d.period ? new Date(d.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"
  }))

  // Format conversion trend
  const formattedConversionTrend = conversionTrendRaw.map(d => ({
    ...d,
    week: d.period ? new Date(d.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"
  }))



  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Insights
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Track booking performance and staff metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <Card className="border bg-card/80">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardTab />
        </CardContent>
      </Card>

      {/* Club Performance Table */}
      <Card className="border bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">
              Club Performance
            </CardTitle>
            <CardDescription>Conversion rates and booking details by venue.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("bookings")}>
              <Download className="h-4 w-4 mr-2" />
              Export Bookings
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("messages")}>
              <Download className="h-4 w-4 mr-2" />
              Export Messages
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : clubBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No booking data available for this period.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clubBookings.map((club) => {
                const totalBookings =
                  club.total ??
                  club.confirmed +
                    club.pending +
                    club.notAvailable +
                    club.cancelled
                const confirmedShare =
                  totalBookings > 0 ? (club.confirmed / totalBookings) * 100 : 0
                const pendingShare =
                  totalBookings > 0 ? (club.pending / totalBookings) * 100 : 0
                const lostShare =
                  totalBookings > 0
                    ? ((club.notAvailable + club.cancelled) / totalBookings) * 100
                    : 0
                const conversionRate = Math.round((club.conversionRate ?? 0) * 100)

                return (
                  <div
                    key={club.clubId}
                    className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-input bg-gradient-to-b from-card/80 to-card/20 p-5 shadow-lg transition hover:shadow-xl"
                  >
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {club.region ?? "Club"}
                      </p>
                      <p className="text-lg font-semibold">{club.clubName}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalBookings ?? 0} bookings tracked
                      </p>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-foreground">
                          {conversionRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          conversion rate
                        </p>
                      </div>
                      <div className="mr-2 flex flex-col items-end text-xs text-muted-foreground">
                        <span>
                          {club.confirmed} confirmed
                        </span>
                        <span>
                          {club.pending} pending
                        </span>
                        <span>
                          {club.notAvailable + club.cancelled} lost
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Confirmed share</span>
                          <span className="font-semibold text-foreground">
                            {confirmedShare.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted/40">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                            style={{ width: `${confirmedShare}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Pending share</span>
                          <span className="font-semibold text-foreground">
                            {pendingShare.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted/40">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                            style={{ width: `${pendingShare}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Lost share</span>
                          <span className="font-semibold text-foreground">
                            {lostShare.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted/40">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-red-400 to-rose-600"
                            style={{ width: `${lostShare}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid - Row 1: New Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booking Trend */}
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Booking Trend
            </CardTitle>
            <CardDescription>Daily bookings over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingTrendChart data={bookingTrend} loading={loading} />
          </CardContent>
        </Card>

        {/* Bookings by Club */}
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Bookings by Club
            </CardTitle>
            <CardDescription>Performance by venue.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingsByClubChart data={clubBookings} loading={loading} />
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Booking Status Distribution
            </CardTitle>
            <CardDescription>Breakdown by outcome.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistributionChart data={statusPieData} loading={loading} />
          </CardContent>
        </Card>

        {/* Conversion & Response Time */}
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Conversion & Response Time
            </CardTitle>
            <CardDescription>Weekly conversion rate and staff SLA.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionResponseChart data={formattedConversionTrend} />
          </CardContent>
        </Card>

        {/* Automation Mix */}
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Automation Mix
            </CardTitle>
            <CardDescription>Share of automated vs handoff work.</CardDescription>
          </CardHeader>
          <CardContent>
            <AutomationMixChart data={automationTrendFormatted} />
          </CardContent>
        </Card>

        {/* Request Mix */}
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Request Mix
            </CardTitle>
            <CardDescription>What members ask for most.</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestMixChart data={sourceMix} />
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
