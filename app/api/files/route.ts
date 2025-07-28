import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/user/api"

export async function GET(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const sortBy = searchParams.get("sortBy") || "newest"
    const filterBy = searchParams.get("filterBy") || "all"
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Ensure user can only access their own files
    if (userId !== userProfile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    // Build query
    let query = supabase
      .from("chat_attachments")
      .select(`
        *,
        chat:chats(id, title)
      `)
      .eq("user_id", userId)

    // Apply filtering
    if (filterBy !== "all") {
      switch (filterBy) {
        case "images":
          query = query.like("file_type", "image/%")
          break
        case "documents":
          query = query.eq("file_type", "application/pdf")
          break
        case "text":
          query = query.like("file_type", "text/%")
          break
      }
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        query = query.order("created_at", { ascending: false })
        break
      case "oldest":
        query = query.order("created_at", { ascending: true })
        break
      case "name":
        query = query.order("file_name", { ascending: true })
        break
      case "size":
        query = query.order("file_size", { ascending: false })
        break
      case "type":
        query = query.order("file_type", { ascending: true })
        break
      default:
        query = query.order("created_at", { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: files, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 }
      )
    }

    return NextResponse.json(files || [])
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
