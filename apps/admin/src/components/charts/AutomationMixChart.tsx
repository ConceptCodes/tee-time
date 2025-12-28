import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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

interface AutomationMixChartProps {
  data: { week: string; automated: number; handoff: number }[]
}

export function AutomationMixChart({ data }: AutomationMixChartProps) {
  return (
    <ChartContainer
      config={automationConfig}
      className="h-[260px] w-full"
    >
      <AreaChart data={data} margin={{ left: 8, right: 8 }}>
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
  )
}
