import type { NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

interface FileAnalytics {
  totalFiles: number
  totalSize: number
  averageFileSize: number
  uploadTrend: {
    period: string
    count: number
    size: number
  }[]
  topFileTypes: {
    type: string
    count: number
    size: number
    percentage: number
  }[]
  storageUsageByMonth: {
    month: string
    size: number
    count: number
  }[]
  dailyUploads: {
    date: string
    count: number
    size: number
  }[]
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const period = searchParams.get("period") || "30d"

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
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

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get all files for the user within the period
    const { data: files, error: filesError } = await supabase
      .from("chat_attachments")
      .select("file_name, file_type, file_size, created_at")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })

    if (filesError) {
      console.error("Error fetching files for analytics:", filesError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch file analytics" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const validFiles =
      files?.filter((file: any) => file.file_size && file.file_size > 0) || []

    // Calculate basic stats
    const totalFiles = validFiles.length
    const totalSize = validFiles.reduce(
      (sum: number, file: any) => sum + (file.file_size || 0),
      0
    )
    const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0

    // Calculate file type distribution
    const fileTypeStats = new Map<string, { count: number; size: number }>()

    validFiles.forEach((file: any) => {
      const type = getFileTypeCategory(file.file_type)
      const current = fileTypeStats.get(type) || { count: 0, size: 0 }
      fileTypeStats.set(type, {
        count: current.count + 1,
        size: current.size + (file.file_size || 0),
      })
    })

    const topFileTypes = Array.from(fileTypeStats.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        size: stats.size,
        percentage: totalFiles > 0 ? (stats.count / totalFiles) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate daily uploads
    const dailyStats = new Map<string, { count: number; size: number }>()

    validFiles.forEach((file: any) => {
      const date = new Date(file.created_at).toISOString().split("T")[0]
      const current = dailyStats.get(date) || { count: 0, size: 0 }
      dailyStats.set(date, {
        count: current.count + 1,
        size: current.size + (file.file_size || 0),
      })
    })

    const dailyUploads = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        size: stats.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate upload trend (simplified)
    const uploadTrend = [
      {
        period,
        count: totalFiles,
        size: totalSize,
      },
    ]

    // Calculate monthly storage usage
    const monthlyStats = new Map<string, { count: number; size: number }>()

    validFiles.forEach((file: any) => {
      const date = new Date(file.created_at)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const current = monthlyStats.get(month) || { count: 0, size: 0 }
      monthlyStats.set(month, {
        count: current.count + 1,
        size: current.size + (file.file_size || 0),
      })
    })

    const storageUsageByMonth = Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month,
        count: stats.count,
        size: stats.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const analytics: FileAnalytics = {
      totalFiles,
      totalSize,
      averageFileSize,
      uploadTrend,
      topFileTypes,
      storageUsageByMonth,
      dailyUploads,
    }

    return new Response(JSON.stringify(analytics), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in /api/files/analytics:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

function getFileTypeCategory(fileType: string | null): string {
  if (!fileType) return "Unknown"

  if (fileType.startsWith("image/")) return "Images"
  if (fileType.startsWith("audio/")) return "Audio"
  if (fileType.startsWith("video/")) return "Video"
  if (fileType === "application/pdf") return "PDF"
  if (fileType.startsWith("text/")) return "Text"
  if (fileType.includes("document") || fileType.includes("word"))
    return "Documents"
  if (fileType.includes("spreadsheet") || fileType.includes("excel"))
    return "Spreadsheets"
  if (fileType.includes("presentation") || fileType.includes("powerpoint"))
    return "Presentations"

  return "Other"
}
