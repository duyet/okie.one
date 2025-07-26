import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/client"
import { getUserProfile } from "@/lib/user/api"

export async function GET(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // Ensure user can only access their own stats
    if (userId !== userProfile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    // Get all files for the user
    const { data: files, error } = await supabase
      .from("chat_attachments")
      .select("file_type, file_size, created_at")
      .eq("user_id", userId)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to fetch file statistics" },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalFiles = files?.length || 0
    const totalSize =
      files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0

    // Count files by type
    const filesByType: Record<string, number> = {}
    files?.forEach((file) => {
      const category = getFileCategory(file.file_type)
      filesByType[category] = (filesByType[category] || 0) + 1
    })

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentUploads =
      files?.filter((file) => new Date(file.created_at) > thirtyDaysAgo)
        .length || 0

    const stats = {
      totalFiles,
      totalSize,
      filesByType,
      recentActivity: {
        uploads: recentUploads,
        downloads: 0, // This would require tracking download events
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function getFileCategory(fileType: string | null): string {
  if (!fileType) return "Unknown"

  if (fileType.startsWith("image/")) return "Images"
  if (fileType === "application/pdf") return "Documents"
  if (fileType.startsWith("text/")) return "Text"
  if (fileType.startsWith("audio/")) return "Audio"
  if (fileType.startsWith("video/")) return "Video"

  return "Other"
}
