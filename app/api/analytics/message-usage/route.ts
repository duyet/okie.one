import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get("messageId")
    const chatId = searchParams.get("chatId")
    const userId = searchParams.get("userId")

    if (!messageId || !chatId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: messageId, chatId, and userId" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get token usage for the specific message
    const { data: tokenUsage, error } = await supabase
      .from("token_usage")
      .select(`
        input_tokens,
        output_tokens,
        cached_tokens,
        total_tokens,
        duration_ms,
        time_to_first_token_ms,
        time_to_first_chunk_ms,
        streaming_duration_ms,
        estimated_cost_usd,
        cost_per_input_token_usd,
        cost_per_output_token_usd,
        provider_id,
        model_id,
        created_at
      `)
      .eq("message_id", messageId)
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching token usage:", error)
      return NextResponse.json(
        { error: "Failed to fetch token usage data" },
        { status: 500 }
      )
    }

    // Return the usage data (or empty array if no data found)
    return NextResponse.json(tokenUsage || [])
  } catch (error) {
    console.error("Error in message usage API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
