import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

interface DailyModelUsage {
  usage_date: string
  model_data: Record<
    string,
    {
      tokens: number
      messages: number
      cost: number
    }
  >
  daily_total_tokens: number
  daily_total_messages: number
  daily_total_cost: number
}

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

interface ApiResponse {
  chartData: ChartDataPoint[]
  models: ModelInfo[]
  totalTokens: number
  totalMessages: number
  totalCost: number
  periodLabel: string
}

// Predefined colors for models (matching the chart theme)
const MODEL_COLORS = [
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6366f1", // Indigo
] as const

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case "7d":
      return "Last 7 days"
    case "30d":
      return "Last 30 days"
    case "90d":
      return "Last 90 days"
    default:
      return "Last 30 days"
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const period = searchParams.get("period") || "30d"

    const supabase = await createClient()
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Database connection failed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Convert period to days
    const daysBack =
      period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30

    // Call the database function
    const { data: rawData, error } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>
      }
    ).rpc("get_daily_model_token_summary", {
      days_back: daysBack,
      target_user_id: userId || null,
    })

    if (error) {
      console.error("Database error:", error)
      return new Response(
        JSON.stringify({
          error: `Failed to fetch daily token usage: ${error instanceof Error ? error.message : String(error)}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const dailyData = (rawData || []) as DailyModelUsage[]

    if (dailyData.length === 0) {
      const response: ApiResponse = {
        chartData: [],
        models: [],
        totalTokens: 0,
        totalMessages: 0,
        totalCost: 0,
        periodLabel: getPeriodLabel(period),
      }
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Extract all unique models from the data
    const allModels = new Set<string>()
    dailyData.forEach((day) => {
      if (day.model_data) {
        Object.keys(day.model_data).forEach((model) => allModels.add(model))
      }
    })

    // Create model info with colors
    const models: ModelInfo[] = Array.from(allModels).map(
      (modelName, index) => {
        const provider = modelName.toLowerCase().includes("gpt")
          ? "openai"
          : modelName.toLowerCase().includes("claude")
            ? "anthropic"
            : modelName.toLowerCase().includes("gemini")
              ? "google"
              : modelName.toLowerCase().includes("mistral")
                ? "mistral"
                : "other"

        return {
          id: modelName.toLowerCase().replace(/\s+/g, "-"),
          name: modelName,
          provider,
          color: MODEL_COLORS[index % MODEL_COLORS.length],
        }
      }
    )

    // Transform data for chart
    const chartData: ChartDataPoint[] = dailyData.map((day) => {
      const dataPoint: ChartDataPoint = {
        date: formatDate(day.usage_date),
      }

      // Add token count for each model
      models.forEach((model) => {
        const modelData = day.model_data?.[model.name]
        dataPoint[model.name] = modelData?.tokens || 0
      })

      return dataPoint
    })

    // Calculate totals
    const totalTokens = dailyData.reduce(
      (sum, day) => sum + (day.daily_total_tokens || 0),
      0
    )
    const totalMessages = dailyData.reduce(
      (sum, day) => sum + (day.daily_total_messages || 0),
      0
    )
    const totalCost = dailyData.reduce(
      (sum, day) => sum + (day.daily_total_cost || 0),
      0
    )

    const response: ApiResponse = {
      chartData,
      models,
      totalTokens,
      totalMessages,
      totalCost,
      periodLabel: getPeriodLabel(period),
    }

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in /api/analytics/daily-token-usage:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
