import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Cell, Pie, PieChart } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

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

interface StatusDistributionChartProps {
  data: { name: string; value: number; fill: string }[]
  loading: boolean
}

export function StatusDistributionChart({ data, loading }: StatusDistributionChartProps) {
  if (loading) {
    return <Skeleton className="h-[260px] w-full" />
  }

  return (
    <ChartContainer config={statusConfig} className="h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={95}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
