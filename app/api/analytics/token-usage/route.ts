import type { NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  getDailyLeaderboard,
  getUserTokenAnalytics,
  getUserUsageStats,
} from "@/lib/token-tracking/api"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const type = searchParams.get("type") || "user" // user, leaderboard
    const period = searchParams.get("period") || "30d"

    if (!userId && type === "user") {
      return new Response(
        JSON.stringify({ error: "User ID is required for user analytics" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

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

    let data: Record<string, unknown> = {}

    if (type === "leaderboard") {
      // Get daily leaderboard
      const today = new Date().toISOString().split("T")[0]
      const leaderboard = await getDailyLeaderboard(today, 10)
      data = { leaderboard }
    } else if (type === "user" && userId) {
      // Get user analytics
      const daysBack =
        period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30

      const [analytics, stats] = await Promise.all([
        getUserTokenAnalytics(userId, daysBack),
        getUserUsageStats(userId),
      ])

      data = { analytics, stats }
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in /api/analytics/token-usage:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
