/**
 * User Analytics API
 *
 * GET /api/admin/analytics/users
 * Returns user metrics including growth, activity, and engagement statistics
 */

import { type NextRequest, NextResponse } from "next/server"

import { adminCheck } from "@/app/api/lib/admin-auth"
import { analyticsLogger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

interface UserMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  userGrowthRate: number
}

interface UserActivity {
  userId: string
  userEmail: string | null
  lastActiveAt: string | null
  createdAt: string
  messageCount: number
  tokenUsage: number
}

interface MessageUserId {
  user_id: string | null | undefined
}

interface UserWithActivity {
  id: string
  email: string | null
  created_at: string | null
  messages: { count: number }[] | null
  token_usage: Array<{
    input_tokens: number
    output_tokens: number
  }> | null
}

export async function GET(_request: NextRequest) {
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

    analyticsLogger.info("User analytics request")

    // Get current date and date ranges
    const today = new Date().toISOString().split("T")[0]
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split("T")[0]

    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = monthAgo.toISOString().split("T")[0]

    const twoMonthsAgo = new Date()
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
    const twoMonthsAgoStr = twoMonthsAgo.toISOString().split("T")[0]

    // Get total users
    const { count: totalUsers, error: totalError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })

    if (totalError) {
      throw new Error(`Failed to get total users: ${totalError.message}`)
    }

    // Get new users today
    const { count: newUsersToday, error: todayError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today)

    if (todayError) {
      throw new Error(`Failed to get new users today: ${todayError.message}`)
    }

    // Get new users this week
    const { count: newUsersThisWeek, error: weekError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgoStr)

    if (weekError) {
      throw new Error(`Failed to get new users this week: ${weekError.message}`)
    }

    // Get new users this month
    const { count: newUsersThisMonth, error: monthError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgoStr)

    if (monthError) {
      throw new Error(
        `Failed to get new users this month: ${monthError.message}`
      )
    }

    // Get users from previous month for growth rate calculation
    const { count: usersTwoMonthsAgo, error: prevMonthError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoMonthsAgoStr)
      .lt("created_at", monthAgoStr)

    if (prevMonthError) {
      throw new Error(
        `Failed to get users from previous month: ${prevMonthError.message}`
      )
    }

    // Calculate growth rate (month-over-month)
    const previousMonthUsers = usersTwoMonthsAgo || 0
    const currentMonthUsers = newUsersThisMonth || 0
    const userGrowthRate =
      previousMonthUsers > 0
        ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
        : 0

    // Get active users (users with messages in the last 7 days)
    const { data: activeUsersData, error: activeError } = await supabase
      .from("messages")
      .select("user_id")
      .gte("created_at", weekAgoStr)

    if (activeError) {
      throw new Error(`Failed to get active users: ${activeError.message}`)
    }

    const activeUsersSet = new Set(
      activeUsersData?.map((e: MessageUserId) => e.user_id).filter((id): id is string => id !== null && id !== undefined) || []
    )
    const activeUsers = activeUsersSet.size

    // Get recent user activity with message counts and token usage
    const { data: usersWithActivity, error: activityError } = await supabase
      .from("users")
      .select(`
        id,
        email,
        created_at,
        messages(count),
        token_usage(input_tokens, output_tokens)
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    if (activityError) {
      throw new Error(`Failed to get user activity: ${activityError.message}`)
    }

    // Transform user activity data
    const recentUsers: UserActivity[] = (usersWithActivity || []).map(
      (user: UserWithActivity) => {
        const messageCount = user.messages?.[0]?.count || 0
        const tokenUsageData = user.token_usage || []
        const totalTokens = tokenUsageData.reduce(
          (sum: number, t: { input_tokens?: number; output_tokens?: number }) =>
            sum + (t.input_tokens || 0) + (t.output_tokens || 0),
          0
        )

        return {
          userId: user.id,
          userEmail: user.email,
          lastActiveAt: null, // Would need to join with event_tracking or messages
          createdAt: user.created_at || "",
          messageCount,
          tokenUsage: totalTokens,
        }
      }
    )

    const metrics: UserMetrics = {
      totalUsers: totalUsers || 0,
      activeUsers,
      newUsersToday: newUsersToday || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
    }

    analyticsLogger.info("User analytics retrieved", {
      totalUsers: metrics.totalUsers,
      activeUsers: metrics.activeUsers,
      growthRate: metrics.userGrowthRate,
    })

    return NextResponse.json({
      metrics,
      recentUsers,
    })
  } catch (error) {
    analyticsLogger.error("Error in user analytics API", {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        error: "Failed to retrieve user analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
