import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, ComposedChart, CartesianGrid, Line, XAxis, YAxis } from "recharts"

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

interface ConversionResponseChartProps {
  data: { week: string; conversion: number; response: number }[]
}

export function ConversionResponseChart({ data }: ConversionResponseChartProps) {
  return (
    <ChartContainer
      config={conversionConfig}
      className="h-[260px] w-full"
    >
      <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
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
      </ComposedChart>
    </ChartContainer>
  )
}
