/**
 * Token Usage Analytics API
 *
 * GET /api/admin/analytics/tokens
 * Returns token usage statistics, trends, and model usage patterns
 */

import { type NextRequest, NextResponse } from "next/server"

import { adminCheck } from "@/app/api/lib/admin-auth"
import { analyticsLogger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

interface TokenMetrics {
  totalTokens: number
  totalCost: number
  totalMessages: number
  averageTokensPerMessage: number
  topProvider: string
  topModel: string
}

interface ModelUsage {
  providerId: string
  modelId: string
  totalTokens: number
  totalCost: number
  messageCount: number
  averageTokensPerMessage: number
}

interface DailyTokenUsage {
  date: string
  totalTokens: number
  totalCost: number
  messageCount: number
}

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await adminCheck()
  if (authError) {
    return authError
  }

  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get("days") || "30", 10)

    // Validate daysBack parameter
    if (daysBack < 1 || daysBack > 365) {
      return NextResponse.json(
        { error: "Days parameter must be between 1 and 365" },
        { status: 400 }
      )
    }

    analyticsLogger.info("Token analytics request", { daysBack })

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString()

    // Get token usage data
    const { data: tokenUsage, error: tokenError } = await supabase
      .from("token_usage")
      .select("*")
      .gte("created_at", startDateStr)
      .order("created_at", { ascending: true })

    if (tokenError) {
      throw new Error(`Failed to get token usage: ${tokenError.message}`)
    }

    // Calculate overall metrics
    const totalTokens = (tokenUsage || []).reduce(
      (sum, t) => sum + (t.input_tokens || 0) + (t.output_tokens || 0),
      0
    )

    const totalCost = (tokenUsage || []).reduce(
      (sum, t) => sum + (t.estimated_cost_usd || 0),
      0
    )

    const totalMessages = tokenUsage?.length || 0
    const averageTokensPerMessage =
      totalMessages > 0 ? totalTokens / totalMessages : 0

    // Calculate top provider and model
    const providerMap = new Map<string, number>()
    const modelMap = new Map<string, number>()

    for (const t of tokenUsage || []) {
      const providerTokens =
        (providerMap.get(t.provider_id) || 0) +
        (t.input_tokens || 0) +
        (t.output_tokens || 0)
      providerMap.set(t.provider_id, providerTokens)

      const modelKey = `${t.provider_id}/${t.model_id}`
      const modelTokens =
        (modelMap.get(modelKey) || 0) +
        (t.input_tokens || 0) +
        (t.output_tokens || 0)
      modelMap.set(modelKey, modelTokens)
    }

    const topProvider =
      Array.from(providerMap.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "none"

    const topModel =
      Array.from(modelMap.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "none"

    const metrics: TokenMetrics = {
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
      totalMessages,
      averageTokensPerMessage: Math.round(averageTokensPerMessage * 100) / 100,
      topProvider,
      topModel,
    }

    // Calculate model usage breakdown
    const modelUsageMap = new Map<string, ModelUsage>()

    for (const t of tokenUsage || []) {
      const modelKey = `${t.provider_id}/${t.model_id}`

      if (!modelUsageMap.has(modelKey)) {
        modelUsageMap.set(modelKey, {
          providerId: t.provider_id,
          modelId: t.model_id,
          totalTokens: 0,
          totalCost: 0,
          messageCount: 0,
          averageTokensPerMessage: 0,
        })
      }

      const usage = modelUsageMap.get(modelKey)!
      const tokens = (t.input_tokens || 0) + (t.output_tokens || 0)

      usage.totalTokens += tokens
      usage.totalCost += t.estimated_cost_usd || 0
      usage.messageCount++
      usage.averageTokensPerMessage = usage.totalTokens / usage.messageCount
    }

    const modelUsage = Array.from(modelUsageMap.values())
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10) // Top 10 models
      .map((usage) => ({
        ...usage,
        totalCost: Math.round(usage.totalCost * 10000) / 10000,
        averageTokensPerMessage:
          Math.round(usage.averageTokensPerMessage * 100) / 100,
      }))

    // Calculate daily token usage
    const dailyUsageMap = new Map<string, DailyTokenUsage>()

    for (const t of tokenUsage || []) {
      const dateKey = new Date(t.created_at || "").toISOString().split("T")[0]

      if (!dailyUsageMap.has(dateKey)) {
        dailyUsageMap.set(dateKey, {
          date: dateKey,
          totalTokens: 0,
          totalCost: 0,
          messageCount: 0,
        })
      }

      const daily = dailyUsageMap.get(dateKey)!
      const tokens = (t.input_tokens || 0) + (t.output_tokens || 0)

      daily.totalTokens += tokens
      daily.totalCost += t.estimated_cost_usd || 0
      daily.messageCount++
    }

    const dailyUsage = Array.from(dailyUsageMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((daily) => ({
        ...daily,
        totalCost: Math.round(daily.totalCost * 10000) / 10000,
      }))

    // Calculate summary statistics
    const averageDailyTokens =
      dailyUsage.length > 0 ? totalTokens / dailyUsage.length : 0

    const peakDailyTokens =
      dailyUsage.length > 0
        ? Math.max(...dailyUsage.map((d) => d.totalTokens))
        : 0

    const summary = {
      averageDailyTokens: Math.round(averageDailyTokens),
      peakDailyTokens,
      averageDailyCost:
        dailyUsage.length > 0
          ? Math.round((totalCost / dailyUsage.length) * 10000) / 10000
          : 0,
    }

    analyticsLogger.info("Token analytics retrieved", {
      totalTokens: metrics.totalTokens,
      totalCost: metrics.totalCost,
      totalMessages: metrics.totalMessages,
      days: dailyUsage.length,
    })

    return NextResponse.json({
      metrics,
      modelUsage,
      dailyUsage,
      summary,
    })
  } catch (error) {
    analyticsLogger.error("Error in token analytics API", {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        error: "Failed to retrieve token analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
