import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

type BookingTrend = {
  period: string
  total: number
  confirmed: number
  conversionRate: number
}

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

interface BookingTrendChartProps {
  data: BookingTrend[]
  loading: boolean
}

export function BookingTrendChart({ data, loading }: BookingTrendChartProps) {
  if (loading) {
    return <Skeleton className="h-[260px] w-full" />
  }

  return (
    <ChartContainer config={bookingTrendConfig} className="h-[260px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8 }}>
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
  )
}
