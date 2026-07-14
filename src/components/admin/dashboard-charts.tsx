"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const revenueConfig = {
  total: { label: "Revenue", color: "var(--primary)" },
} satisfies ChartConfig;

const volumeConfig = {
  count: { label: "Count", color: "var(--primary)" },
} satisfies ChartConfig;

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function RevenueTrendChart({
  data,
}: {
  data: { date: string; total: number }[];
}) {
  return (
    <ChartContainer config={revenueConfig} className="h-64 w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatShortDate}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                typeof value === "string" ? formatShortDate(value) : value
              }
            />
          }
        />
        <Area
          dataKey="total"
          type="monotone"
          fill="var(--color-total)"
          fillOpacity={0.2}
          stroke="var(--color-total)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function DayCountBarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return (
    <ChartContainer config={volumeConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatShortDate}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                typeof value === "string" ? formatShortDate(value) : value
              }
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
