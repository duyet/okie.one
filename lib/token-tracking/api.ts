/* eslint-disable @typescript-eslint/no-explicit-any */
// Token tracking API utilities

import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import type {
  TokenUsage,
  DailyTokenUsage,
  LeaderboardEntry,
  UserAnalytics,
  TokenUsageMetrics,
  // TokenTrackingError,
} from "./types"
import {
  calculateTokenCost,
  getProviderModelKey,
  TokenTrackingError as TokenError,
  TOKEN_COSTS,
} from "./types"

/**
 * Records token usage for a specific message
 */
export async function recordTokenUsage(
  userId: string,
  chatId: string,
  messageId: string,
  providerId: string,
  modelId: string,
  metrics: TokenUsageMetrics
): Promise<TokenUsage> {
  try {
    // Use service role client for token tracking to ensure proper permissions
    const supabase = await createGuestServerClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    const providerModelKey = getProviderModelKey(providerId, modelId)
    const estimatedCost = calculateTokenCost(
      providerModelKey,
      metrics.inputTokens,
      metrics.outputTokens
    )

    // Get current pricing for historical record
    const costs = TOKEN_COSTS[providerModelKey] || TOKEN_COSTS.default

    // Note: TOKEN_COSTS values are per 1K tokens (see types.ts comment)
    // Convert to per-token cost for storage
    const costPerInputToken = costs.input / 1000 // costs.input is per 1K tokens
    const costPerOutputToken = costs.output / 1000 // costs.output is per 1K tokens

    const tokenUsage: Omit<TokenUsage, "id" | "created_at" | "updated_at"> = {
      user_id: userId,
      chat_id: chatId,
      message_id: messageId,
      provider_id: providerId,
      model_id: modelId,
      input_tokens: metrics.inputTokens,
      output_tokens: metrics.outputTokens,
      cached_tokens: metrics.cachedTokens,
      duration_ms: metrics.durationMs,
      time_to_first_token_ms: metrics.timeToFirstTokenMs,
      time_to_first_chunk_ms: metrics.timeToFirstChunkMs,
      streaming_duration_ms: metrics.streamingDurationMs,
      estimated_cost_usd: estimatedCost,
      cost_per_input_token_usd: costPerInputToken,
      cost_per_output_token_usd: costPerOutputToken,
    }

    const { data, error } = await supabase
      .from("token_usage" as any) // TODO: Fix types after database migration
      .insert([tokenUsage])
      .select()
      .single()

    if (error) {
      throw new TokenError(
        `Failed to record token usage: ${error.message}`,
        "INSERT_ERROR",
        { error, tokenUsage }
      )
    }

    return data as any
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error recording token usage: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}

/**
 * Gets daily token usage leaderboard
 */
export async function getDailyLeaderboard(
  date: string = new Date().toISOString().split("T")[0],
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    const { data, error } = await (supabase as any).rpc(
      "get_daily_token_leaderboard",
      {
        target_date: date,
        limit_count: limit,
      }
    )

    if (error) {
      throw new TokenError(
        `Failed to get leaderboard: ${error.message}`,
        "LEADERBOARD_ERROR",
        { error, date, limit }
      )
    }

    return (data || []) as any[] // TODO: Fix types after database migration
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error getting leaderboard: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}

/**
 * Gets user token analytics for a specific period
 */
export async function getUserTokenAnalytics(
  userId: string,
  daysBack: number = 30
): Promise<UserAnalytics[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    const { data, error } = await (supabase as any).rpc(
      "get_user_token_analytics",
      {
        target_user_id: userId,
        days_back: daysBack,
      }
    )

    if (error) {
      throw new TokenError(
        `Failed to get user analytics: ${error.message}`,
        "ANALYTICS_ERROR",
        { error, userId, daysBack }
      )
    }

    return (data || []) as any[] // TODO: Fix types after database migration
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error getting user analytics: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}

/**
 * Gets current user's daily token usage summary
 */
export async function getUserDailyUsage(
  userId: string,
  date: string = new Date().toISOString().split("T")[0]
): Promise<DailyTokenUsage[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    const { data, error } = await supabase
      .from("daily_token_usage" as any) // TODO: Fix types after database migration
      .select("*")
      .eq("user_id", userId)
      .eq("usage_date", date)
      .order("total_tokens", { ascending: false })

    if (error) {
      throw new TokenError(
        `Failed to get daily usage: ${error.message}`,
        "DAILY_USAGE_ERROR",
        { error, userId, date }
      )
    }

    return (data || []) as any[] // TODO: Fix types after database migration
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error getting daily usage: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}

/**
 * Gets token usage for a specific chat
 */
export async function getChatTokenUsage(
  chatId: string,
  userId: string
): Promise<TokenUsage[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    const { data, error } = await supabase
      .from("token_usage" as any)
      .select("*")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (error) {
      throw new TokenError(
        `Failed to get chat token usage: ${error.message}`,
        "CHAT_USAGE_ERROR",
        { error, chatId, userId }
      )
    }

    return (data || []) as any[] // TODO: Fix types after database migration
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error getting chat usage: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}

/**
 * Gets aggregated usage statistics for a user
 */
export async function getUserUsageStats(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalTokens: number
  totalMessages: number
  totalCost: number
  averageDuration: number
  topProvider: string
  topModel: string
}> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    let query = supabase
      .from("token_usage" as any)
      .select("*")
      .eq("user_id", userId)

    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { data, error } = await query

    if (error) {
      throw new TokenError(
        `Failed to get usage stats: ${error.message}`,
        "USAGE_STATS_ERROR",
        { error, userId, startDate, endDate }
      )
    }

    const usage = (data || []) as any[] // TODO: Fix types after database migration

    // Calculate aggregated statistics
    const totalTokens = usage.reduce(
      (sum, u) => sum + (u.input_tokens + u.output_tokens),
      0
    )
    const totalMessages = usage.length
    const totalCost = usage.reduce(
      (sum, u) => sum + (u.estimated_cost_usd || 0),
      0
    )
    const totalDuration = usage.reduce(
      (sum, u) => sum + (u.duration_ms || 0),
      0
    )
    const averageDuration =
      totalMessages > 0 ? totalDuration / totalMessages : 0

    // Find top provider and model
    const providerCounts = usage.reduce(
      (acc, u) => {
        acc[u.provider_id] =
          (acc[u.provider_id] || 0) + u.input_tokens + u.output_tokens
        return acc
      },
      {} as Record<string, number>
    )

    const modelCounts = usage.reduce(
      (acc, u) => {
        acc[u.model_id] =
          (acc[u.model_id] || 0) + u.input_tokens + u.output_tokens
        return acc
      },
      {} as Record<string, number>
    )

    const topProvider =
      Object.entries(providerCounts).sort(
        ([, a], [, b]) => (b as number) - (a as number)
      )[0]?.[0] || "none"

    const topModel =
      Object.entries(modelCounts).sort(
        ([, a], [, b]) => (b as number) - (a as number)
      )[0]?.[0] || "none"

    return {
      totalTokens,
      totalMessages,
      totalCost,
      averageDuration,
      topProvider,
      topModel,
    }
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error getting usage stats: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}

/**
 * Gets detailed timing analytics for a user
 */
export async function getTimingAnalytics(
  userId: string,
  daysBack: number = 7
): Promise<any[]> {
  // TODO: Fix types after database migration
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new TokenError("Database connection failed", "DB_CONNECTION_ERROR")
    }

    const { data, error } = await (supabase as any).rpc(
      "get_timing_analytics",
      {
        target_user_id: userId,
        days_back: daysBack,
      }
    )

    if (error) {
      throw new TokenError(
        `Failed to get timing analytics: ${error.message}`,
        "TIMING_ANALYTICS_ERROR",
        { error, userId, daysBack }
      )
    }

    return (data || []) as any[] // TODO: Fix types after database migration
  } catch (error) {
    if (error instanceof TokenError) {
      throw error
    }

    throw new TokenError(
      `Unexpected error getting timing analytics: ${error instanceof Error ? error.message : String(error)}`,
      "UNEXPECTED_ERROR",
      { originalError: error }
    )
  }
}
