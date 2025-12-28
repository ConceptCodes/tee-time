import { useEffect, useState } from "react"
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

// Chart Components
import { BookingTrendChart } from "@/components/charts/BookingTrendChart"
import { BookingsByClubChart } from "@/components/charts/BookingsByClubChart"
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart"
import { ConversionResponseChart } from "@/components/charts/ConversionResponseChart"
import { AutomationMixChart } from "@/components/charts/AutomationMixChart"
import { RequestMixChart } from "@/components/charts/RequestMixChart"

type BookingTrend = {
  period: string
  total: number
  confirmed: number
  conversionRate: number
}

type ClubBooking = {
  clubId: string
  clubName: string
  total: number
  confirmed: number
  pending: number
  notAvailable: number
  cancelled: number
  conversionRate: number
}

type ConversionData = {
  total: number
  confirmed: number
  notAvailable: number
  cancelled: number
  conversionRate: number
}

// Mock data for charts that don't have API yet
const automationTrend = [
  { week: "W1", automated: 78, handoff: 22 },
  { week: "W2", automated: 81, handoff: 19 },
  { week: "W3", automated: 84, handoff: 16 },
  { week: "W4", automated: 82, handoff: 18 },
  { week: "W5", automated: 86, handoff: 14 },
]

const sourceMix = [
  { name: "booking", value: 58, fill: "var(--chart-1)" },
  { name: "faq", value: 28, fill: "var(--chart-2)" },
  { name: "support", value: 14, fill: "var(--chart-3)" },
]

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export default function ReportsPage() {
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  
  // Data state
  const [bookingTrend, setBookingTrend] = useState<BookingTrend[]>([])
  const [clubBookings, setClubBookings] = useState<ClubBooking[]>([])
  const [conversionData, setConversionData] = useState<ConversionData | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [trendRes, clubRes, conversionRes] = await Promise.all([
        fetch(`/api/reports/booking-trend?period=${period}&groupBy=day`, { credentials: "include" }),
        fetch(`/api/reports/bookings-by-club?period=${period}`, { credentials: "include" }),
        fetch(`/api/reports/conversion-rate?period=${period}`, { credentials: "include" }),
      ])

      if (trendRes.ok) {
        const data = await trendRes.json()
        setBookingTrend(data.data.map((d: BookingTrend) => ({
          ...d,
          period: new Date(d.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        })))
      }

      if (clubRes.ok) {
        const data = await clubRes.json()
        setClubBookings(data.data)
      }

      if (conversionRes.ok) {
        const data = await conversionRes.json()
        setConversionData(data.data)
      }


    } catch (err) {
      console.error("Failed to fetch report data:", err)
      // Set demo data
      setBookingTrend([
        { period: "Dec 1", total: 12, confirmed: 9, conversionRate: 0.75 },
        { period: "Dec 2", total: 15, confirmed: 12, conversionRate: 0.8 },
        { period: "Dec 3", total: 8, confirmed: 6, conversionRate: 0.75 },
        { period: "Dec 4", total: 20, confirmed: 17, conversionRate: 0.85 },
        { period: "Dec 5", total: 18, confirmed: 14, conversionRate: 0.78 },
        { period: "Dec 6", total: 22, confirmed: 19, conversionRate: 0.86 },
      ])
      setClubBookings([
        { clubId: "1", clubName: "Topgolf", total: 85, confirmed: 68, pending: 5, notAvailable: 8, cancelled: 4, conversionRate: 0.8 },
        { clubId: "2", clubName: "Drive Shack", total: 42, confirmed: 35, pending: 2, notAvailable: 3, cancelled: 2, conversionRate: 0.83 },
        { clubId: "3", clubName: "BigShots", total: 29, confirmed: 22, pending: 3, notAvailable: 2, cancelled: 2, conversionRate: 0.76 },
      ])
      setConversionData({
        total: 156,
        confirmed: 118,
        notAvailable: 15,
        cancelled: 11,
        conversionRate: 0.7564,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period])

  const handleExport = async (type: "bookings" | "messages") => {
    const url = `/api/reports/export/${type}?format=csv`
    window.open(url, "_blank")
  }

  const statusPieData = conversionData ? [
    { name: "Confirmed", value: conversionData.confirmed, fill: CHART_COLORS[1] },
    { name: "Not Available", value: conversionData.notAvailable, fill: CHART_COLORS[2] },
    { name: "Cancelled", value: conversionData.cancelled, fill: CHART_COLORS[3] },
    { name: "Pending", value: conversionData.total - conversionData.confirmed - conversionData.notAvailable - conversionData.cancelled, fill: CHART_COLORS[4] },
  ].filter(d => d.value > 0) : []

  // Conversion trend data for bar chart (mock for now)
  const conversionTrend = [
    { week: "W1", conversion: 68, response: 48 },
    { week: "W2", conversion: 72, response: 44 },
    { week: "W3", conversion: 70, response: 42 },
    { week: "W4", conversion: 75, response: 39 },
    { week: "W5", conversion: 78, response: 36 },
  ]



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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clubBookings.map((club) => (
                <div
                  key={club.clubId}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{club.clubName}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="text-green-600">{club.confirmed} confirmed</span>
                      <span className="text-yellow-600">{club.pending} pending</span>
                      <span className="text-red-600">{club.notAvailable + club.cancelled} lost</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {(club.conversionRate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">{club.total} total</p>
                  </div>
                </div>
              ))}
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
            <ConversionResponseChart data={conversionTrend} />
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
            <AutomationMixChart data={automationTrend} />
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
