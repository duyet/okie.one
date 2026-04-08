/**
 * DAU (Daily Active Users) Analytics API
 *
 * GET /api/admin/analytics/dau
 * Returns daily active user trends for the specified time period
 */

import { type NextRequest, NextResponse } from "next/server"

import { adminCheck } from "@/app/api/lib/admin-auth"
import { analyticsLogger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

interface DAUDataPoint {
  date: string
  total_users: number
  new_users: number
}

type SupabaseRpc = {
  rpc: (name: string, params: { days_back: number }) => Promise<{
    data: DAUDataPoint[] | null
    error: unknown
  }>
}

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

    const supabase = await createClient()

    // Call the get_dau_trend function from our migration
    const { data, error } = await (supabase as unknown as SupabaseRpc).rpc(
      "get_dau_trend",
      {
        days_back: daysBack,
      }
    )

    if (error) {
      analyticsLogger.error("Failed to get DAU data", { error })
      return NextResponse.json(
        { error: "Failed to retrieve DAU data" },
        { status: 500 }
      )
    }

    const dauData = data || []

    // Calculate summary statistics
    const totalActiveUsers = dauData.reduce(
      (sum: number, day: DAUDataPoint) => sum + (day.total_users || 0),
      0
    )
    const averageActiveUsers =
      dauData.length > 0 ? totalActiveUsers / dauData.length : 0
    const peakActiveUsers =
      dauData.length > 0
        ? Math.max(...dauData.map((d: DAUDataPoint) => d.total_users || 0))
        : 0
    const totalNewUsers = dauData.reduce(
      (sum: number, day: DAUDataPoint) => sum + (day.new_users || 0),
      0
    )

    const summary = {
      totalActiveUsers,
      averageActiveUsers: Math.round(averageActiveUsers * 100) / 100,
      peakActiveUsers,
      totalNewUsers,
      periodDays: dauData.length,
    }

    analyticsLogger.info("DAU analytics retrieved", {
      days: data?.length ?? 0,
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
