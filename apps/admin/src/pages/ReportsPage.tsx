import { useEffect, useState } from "react"
import DashboardTab from "@/pages/reports/DashboardTab"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts"
import { Download, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

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
  { name: "booking", value: 58, fill: "hsl(var(--chart-1))" },
  { name: "faq", value: 28, fill: "hsl(var(--chart-2))" },
  { name: "support", value: 14, fill: "hsl(var(--chart-3))" },
]

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const bookingTrendConfig = {
  total: {
    label: "Total",
    color: "var(--chart-1)",
  },
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const statusConfig = {
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-2)",
  },
  notAvailable: {
    label: "Not Available",
    color: "var(--chart-3)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--chart-4)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const automationConfig = {
  automated: {
    label: "Automated",
    color: "var(--chart-4)",
  },
  handoff: {
    label: "Handoff",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const sourceConfig = {
  booking: {
    label: "Booking",
    color: "var(--chart-1)",
  },
  faq: {
    label: "FAQ",
    color: "var(--chart-2)",
  },
  support: {
    label: "Support",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const conversionConfig = {
  conversion: {
    label: "Conversion rate",
    color: "var(--chart-2)",
  },
  response: {
    label: "Avg response (min)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export default function ReportsPage() {
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
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

      setLastUpdated(new Date())
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

  const timeSinceUpdate = () => {
    const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
    if (mins < 1) return "Just now"
    if (mins === 1) return "1 min ago"
    return `${mins} mins ago`
  }

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
          <Badge variant="secondary">{timeSinceUpdate()}</Badge>
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
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartContainer config={bookingTrendConfig} className="h-[260px] w-full">
                <LineChart data={bookingTrend} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    fontSize={12}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="confirmed"
                    stroke="var(--color-confirmed)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
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
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartContainer config={bookingTrendConfig} className="h-[260px] w-full">
                <BarChart data={clubBookings} layout="vertical" margin={{ left: 80, right: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="clubName"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="confirmed" fill="var(--color-confirmed)" radius={4} stackId="a" name="Confirmed" />
                  <Bar dataKey="pending" fill="hsl(var(--chart-5))" radius={4} stackId="a" name="Pending" />
                  <Bar dataKey="notAvailable" fill="hsl(var(--chart-3))" radius={4} stackId="a" name="Not Available" />
                </BarChart>
              </ChartContainer>
            )}
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
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartContainer config={statusConfig} className="h-[260px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    strokeWidth={0}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
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
            <ChartContainer
              config={conversionConfig}
              className="h-[260px] w-full"
            >
              <BarChart data={conversionTrend} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="conversion"
                  fill="var(--color-conversion)"
                  radius={6}
                  name="Conversion %"
                />
                <Line
                  type="monotone"
                  dataKey="response"
                  stroke="var(--color-response)"
                  strokeWidth={2}
                  dot={false}
                  name="Response (min)"
                />
              </BarChart>
            </ChartContainer>
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
            <ChartContainer
              config={automationConfig}
              className="h-[260px] w-full"
            >
              <AreaChart data={automationTrend} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="automated"
                  stackId="a"
                  stroke="var(--color-automated)"
                  fill="var(--color-automated)"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="handoff"
                  stackId="a"
                  stroke="var(--color-handoff)"
                  fill="var(--color-handoff)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
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
            <ChartContainer config={sourceConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                <Pie
                  data={sourceMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  strokeWidth={0}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
