import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { guestUserId } = await request.json()

    if (!guestUserId) {
      return new Response(JSON.stringify({ error: "Missing guest user ID" }), {
        status: 400,
      })
    }

    const supabase = await createClient()
    if (!supabase) {
      return new Response(JSON.stringify({ error: "Supabase not available" }), {
        status: 500,
      })
    }

    // Get the authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
      })
    }

    const authenticatedUserId = authData.user.id

    // Check if the guest user exists and is anonymous
    const { data: guestUser, error: guestError } = await supabase
      .from("users")
      .select("id, anonymous")
      .eq("id", guestUserId)
      .eq("anonymous", true)
      .single()

    if (guestError || !guestUser) {
      return new Response(JSON.stringify({ error: "Invalid guest user" }), {
        status: 400,
      })
    }

    // Begin transaction-like operations
    // 1. Update all chats from guest user to authenticated user
    const { error: chatsError } = await supabase
      .from("chats")
      .update({ user_id: authenticatedUserId })
      .eq("user_id", guestUserId)

    if (chatsError) {
      console.error("Error updating chats:", chatsError)
      return new Response(
        JSON.stringify({ error: "Failed to migrate chats" }),
        { status: 500 }
      )
    }

    // 2. Update all messages from guest user to authenticated user
    const { error: messagesError } = await supabase
      .from("messages")
      .update({ user_id: authenticatedUserId })
      .eq("user_id", guestUserId)

    if (messagesError) {
      console.error("Error updating messages:", messagesError)
      return new Response(
        JSON.stringify({ error: "Failed to migrate messages" }),
        { status: 500 }
      )
    }

    // 3. Update token usage records
    const { error: tokenError } = await supabase
      .from("token_usage")
      .update({ user_id: authenticatedUserId })
      .eq("user_id", guestUserId)

    if (tokenError) {
      console.error("Error updating token usage:", tokenError)
      // Non-critical, continue
    }

    // 4. Update daily token usage records
    const { error: dailyTokenError } = await supabase
      .from("daily_token_usage")
      .update({ user_id: authenticatedUserId })
      .eq("user_id", guestUserId)

    if (dailyTokenError) {
      console.error("Error updating daily token usage:", dailyTokenError)
      // Non-critical, continue
    }

    // 5. Update chat attachments
    const { error: attachmentsError } = await supabase
      .from("chat_attachments")
      .update({ user_id: authenticatedUserId })
      .eq("user_id", guestUserId)

    if (attachmentsError) {
      console.error("Error updating attachments:", attachmentsError)
      // Non-critical, continue
    }

    // 6. Clean up guest user preferences
    await supabase.from("user_preferences").delete().eq("user_id", guestUserId)

    // 7. Delete the guest user record
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", guestUserId)

    if (deleteError) {
      console.error("Error deleting guest user:", deleteError)
      // Non-critical, guest user cleanup can be done later
    }

    // Clear guest user ID from localStorage on the client
    return new Response(
      JSON.stringify({
        success: true,
        message: "Guest data successfully merged",
      }),
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error("Error in merge-guest-data endpoint:", err)
    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}
