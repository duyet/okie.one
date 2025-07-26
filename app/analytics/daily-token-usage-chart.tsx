"use client"

import { useQuery } from "@tanstack/react-query"
import { BarChart, TrendingUp, Loader2 } from "lucide-react"
import { useState } from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface ChartDataPoint {
  date: string
  [modelName: string]: number | string
}

interface ModelInfo {
  id: string
  name: string
  provider: string
  color: string
}

interface DailyTokenUsageResponse {
  chartData: ChartDataPoint[]
  models: ModelInfo[]
  totalTokens: number
  totalMessages: number
  totalCost: number
  periodLabel: string
}

interface DailyTokenUsageChartProps {
  userId?: string
}

async function getDailyTokenUsageData(
  period: string = "30d",
  userId?: string
): Promise<DailyTokenUsageResponse> {
  const params = new URLSearchParams({ period })
  if (userId) {
    params.append("userId", userId)
  }

  const response = await fetch(`/api/analytics/daily-token-usage?${params}`)
  if (!response.ok) {
    throw new Error("Failed to fetch daily token usage data")
  }
  return response.json()
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

export function DailyTokenUsageChart({ userId }: DailyTokenUsageChartProps) {
  const [period, setPeriod] = useState("30d")

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["daily-token-usage", period, userId],
    queryFn: () => getDailyTokenUsageData(period, userId),
    staleTime: 300000, // 5 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Daily Token Usage Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading chart data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Daily Token Usage Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Failed to load chart data: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Daily Token Usage Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <BarChart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-lg">No Usage Data</h3>
            <p className="text-muted-foreground">
              No token usage data available for the selected period.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Create chart config from models
  const chartConfig: ChartConfig = {}
  data.models.forEach((model) => {
    chartConfig[model.name] = {
      label: model.name,
      color: model.color,
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Daily Token Usage Leaderboard
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground text-sm">
          Token usage across models • {data.periodLabel}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Total Tokens</span>
            </div>
            <div className="mt-1 font-bold text-2xl">
              {formatTokens(data.totalTokens)}
            </div>
            <div className="text-muted-foreground text-xs">
              {data.totalMessages} messages
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-chart-2" />
              <span className="font-medium text-sm">Daily Average</span>
            </div>
            <div className="mt-1 font-bold text-2xl">
              {formatTokens(Math.round(data.totalTokens / data.chartData.length))}
            </div>
            <div className="text-muted-foreground text-xs">
              per day
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-chart-3" />
              <span className="font-medium text-sm">Total Cost</span>
            </div>
            <div className="mt-1 font-bold text-2xl">
              {formatCost(data.totalCost)}
            </div>
            <div className="text-muted-foreground text-xs">
              estimated
            </div>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart
              data={data.chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatTokens}
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <ChartTooltipContent
                    active={active}
                    payload={payload}
                    label={String(label || '')}
                    formatter={(value, name) => [
                      formatTokens(Number(value)),
                      chartConfig[name as string]?.label || name,
                    ]}
                  />
                )}
              />
              {data.models.map((model) => (
                <Bar
                  key={model.id}
                  dataKey={model.name}
                  stackId="tokens"
                  fill={model.color}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {data.models.map((model) => (
            <div key={model.id} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: model.color }}
              />
              <span className="text-muted-foreground text-sm">{model.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}