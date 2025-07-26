"use client"

import { Clock, DollarSign, Loader2, TrendingUp, Trophy } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DailyTokenUsageChart } from "./daily-token-usage-chart"

interface TokenStats {
  totalTokens: number
  totalMessages: number
  totalCost: number
  averageDuration: number
  averageTimeToFirstToken?: number
  topProvider: string
  topModel: string
}

interface LeaderboardEntry {
  user_id: string
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cached_tokens: number
  total_messages: number
  total_cost_usd: number
  avg_duration_ms: number
  avg_time_to_first_token_ms?: number
  top_provider: string
  top_model: string
}

interface TokenAnalyticsProps {
  userId?: string
  showLeaderboard?: boolean
}

export function TokenAnalytics({
  userId,
  showLeaderboard = false,
}: TokenAnalyticsProps) {
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        if (showLeaderboard) {
          const response = await fetch(
            "/api/analytics/token-usage?type=leaderboard"
          )
          if (!response.ok) throw new Error("Failed to fetch leaderboard")
          const data = await response.json()
          setLeaderboard(data.leaderboard || [])
        }

        if (userId) {
          const response = await fetch(
            `/api/analytics/token-usage?userId=${userId}&type=user`
          )
          if (!response.ok) throw new Error("Failed to fetch user stats")
          const data = await response.json()
          setStats(data.stats || null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        console.error("Token analytics error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId || showLeaderboard) {
      fetchData()
    }
  }, [userId, showLeaderboard])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading analytics: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Daily Token Usage Chart */}
      <DailyTokenUsageChart userId={userId} />

      {/* User Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Tokens
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {stats.totalTokens.toLocaleString()}
              </div>
              <p className="text-muted-foreground text-xs">
                {stats.totalMessages} messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                ${stats.totalCost.toFixed(4)}
              </div>
              <p className="text-muted-foreground text-xs">
                ${(stats.totalCost / stats.totalMessages || 0).toFixed(4)} per
                message
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Avg Duration
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {(stats.averageDuration / 1000).toFixed(1)}s
              </div>
              <p className="text-muted-foreground text-xs">Response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Top Model</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stats.topProvider}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-lg">{stats.topModel}</div>
              <p className="text-muted-foreground text-xs">Most used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Avg Time to First Token
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {stats.averageTimeToFirstToken
                  ? `${(stats.averageTimeToFirstToken / 1000).toFixed(2)}s`
                  : "N/A"}
              </div>
              <p className="text-muted-foreground text-xs">Response latency</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Daily Token Usage Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index < 3 ? "default" : "secondary"}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        User {entry.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {entry.total_tokens.toLocaleString()} tokens •{" "}
                        {entry.total_messages} messages
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ${entry.total_cost_usd.toFixed(4)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {entry.top_model}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!stats && !showLeaderboard && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold text-lg">No Analytics Data</h3>
          <p className="text-muted-foreground">
            Start using AI models to see your token usage analytics here.
          </p>
        </div>
      )}
    </div>
  )
}
