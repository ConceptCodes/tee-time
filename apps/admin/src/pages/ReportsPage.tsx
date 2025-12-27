import DashboardTab from "@/pages/reports/DashboardTab"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "recharts"

const bookingTrend = [
  { month: "Jan", bookings: 420 },
  { month: "Feb", bookings: 510 },
  { month: "Mar", bookings: 610 },
  { month: "Apr", bookings: 560 },
  { month: "May", bookings: 690 },
  { month: "Jun", bookings: 740 },
]

const conversionTrend = [
  { week: "W1", conversion: 68, response: 4.8 },
  { week: "W2", conversion: 72, response: 4.4 },
  { week: "W3", conversion: 70, response: 4.2 },
  { week: "W4", conversion: 75, response: 3.9 },
  { week: "W5", conversion: 78, response: 3.6 },
]

const automationTrend = [
  { week: "W1", automated: 78, handoff: 22 },
  { week: "W2", automated: 81, handoff: 19 },
  { week: "W3", automated: 84, handoff: 16 },
  { week: "W4", automated: 82, handoff: 18 },
  { week: "W5", automated: 86, handoff: 14 },
]

const sourceMix = [
  { name: "booking", value: 58, fill: "var(--color-booking)" },
  { name: "faq", value: 28, fill: "var(--color-faq)" },
  { name: "support", value: 14, fill: "var(--color-support)" },
]

const bookingConfig = {
  bookings: {
    label: "Bookings",
    color: "var(--chart-1)",
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

export default function ReportsPage() {
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
            Track performance and operational trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Updated 2m ago</Badge>
          <Select defaultValue="30d">
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Booking volume
            </CardTitle>
            <CardDescription>Monthly booking demand.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bookingConfig} className="h-[260px] w-full">
              <LineChart data={bookingTrend} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="bookings"
                  stroke="var(--color-bookings)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Conversion & response time
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
                />
                <Line
                  type="monotone"
                  dataKey="response"
                  stroke="var(--color-response)"
                  strokeWidth={2}
                  dot={false}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Automation mix
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
        <Card className="border bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Request mix
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
    </div>
  )
}
