import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

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

const config = {
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-2)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-5)",
  },
  notAvailable: {
    label: "Not Available",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface BookingsByClubChartProps {
  data: ClubBooking[]
  loading: boolean
}

export function BookingsByClubChart({ data, loading }: BookingsByClubChartProps) {
  if (loading) {
    return <Skeleton className="h-[260px] w-full" />
  }

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 8 }}>
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
        <Bar dataKey="pending" fill="var(--chart-5)" radius={4} stackId="a" name="Pending" />
        <Bar dataKey="notAvailable" fill="var(--chart-3)" radius={4} stackId="a" name="Not Available" />
      </BarChart>
    </ChartContainer>
  )
}
