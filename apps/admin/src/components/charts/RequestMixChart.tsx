import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Pie, PieChart } from "recharts"

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

interface RequestMixChartProps {
  data: { name: string; value: number; fill: string }[]
}

export function RequestMixChart({ data }: RequestMixChartProps) {
  return (
    <ChartContainer config={sourceConfig} className="h-[260px] w-full">
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
        />
      </PieChart>
    </ChartContainer>
  )
}
