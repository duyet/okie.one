import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/client"
import { getUserProfile } from "@/lib/user/api"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params
    const supabase = createClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      )
    }

    // First, check if the file belongs to the user
    const { data: file, error: fetchError } = await supabase
      .from("chat_attachments")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userProfile.id)
      .single()

    if (fetchError || !file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      )
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("chat_attachments")
      .delete()
      .eq("id", fileId)
      .eq("user_id", userProfile.id)

    if (deleteError) {
      console.error("Database delete error:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete file record" },
        { status: 500 }
      )
    }

    // Optionally, delete from storage if using Supabase storage
    // Extract file path from URL for Supabase storage deletion
    if (file.file_url?.includes("supabase")) {
      try {
        const urlParts = file.file_url.split("/")
        const bucketIndex = urlParts.findIndex(
          (part) => part === "chat-attachments"
        )
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          const filePath = urlParts.slice(bucketIndex + 1).join("/")

          const { error: storageError } = await supabase.storage
            .from("chat-attachments")
            .remove([filePath])

          if (storageError) {
            console.warn("Storage deletion failed:", storageError)
            // Continue anyway since database record is deleted
          }
        }
      } catch (storageError) {
        console.warn("Storage deletion error:", storageError)
        // Continue anyway since database record is deleted
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
