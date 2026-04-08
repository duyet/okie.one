/**
 * DAU (Daily Active Users) Analytics API
 *
 * GET /api/admin/analytics/dau
 * Returns daily active user trends for the specified time period
 */

import { NextRequest, NextResponse } from "next/server"
import { adminCheck } from "@/app/api/lib/admin-auth"
import { getDailyActiveUsers } from "@/lib/event-tracking/api"
import { analyticsLogger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await adminCheck()
  if (authError) {
    return authError
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get("days") || "30", 10)

    // Validate daysBack parameter
    if (daysBack < 1 || daysBack > 365) {
      return NextResponse.json(
        { error: "Days parameter must be between 1 and 365" },
        { status: 400 }
      )
    }

    analyticsLogger.info("DAU analytics request", { daysBack })

    const data = await getDailyActiveUsers(daysBack)

    // Calculate summary statistics
    const totalActiveUsers = data.reduce((sum, day) => sum + day.active_users, 0)
    const averageActiveUsers = data.length > 0 ? totalActiveUsers / data.length : 0
    const peakActiveUsers = data.length > 0 ? Math.max(...data.map((d) => d.active_users)) : 0
    const totalNewUsers = data.reduce((sum, day) => sum + day.new_users, 0)

    const summary = {
      totalActiveUsers,
      averageActiveUsers: Math.round(averageActiveUsers * 100) / 100,
      peakActiveUsers,
      totalNewUsers,
      periodDays: data.length,
    }

    analyticsLogger.info("DAU analytics retrieved", {
      days: data.length,
      averageActiveUsers: summary.averageActiveUsers,
      peakActiveUsers,
    })

    return NextResponse.json({
      data,
      summary,
    })
  } catch (error) {
    analyticsLogger.error("Error in DAU analytics API", {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        error: "Failed to retrieve DAU analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
