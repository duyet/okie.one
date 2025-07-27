import { createGuestServerClient } from "@/lib/supabase/server-guest"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      })
    }

    const supabase = await createGuestServerClient()
    if (!supabase) {
      console.log("Supabase not enabled, skipping guest creation.")
      return new Response(
        JSON.stringify({ user: { id: userId, anonymous: true } }),
        {
          status: 200,
        }
      )
    }

    // Check if the user record already exists in public.users table
    let { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (!userData) {
      // Try to create the user in public.users
      // This will only work if the userId exists in auth.users (created by signInAnonymously)
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: `${userId}@anonymous.local`,
          anonymous: true,
          message_count: 0,
          premium: false,
          created_at: new Date().toISOString(),
          display_name: "Guest User",
          favorite_models: [],
        })
        .select("*")
        .single()

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === "23503") {
          console.error(
            "Foreign key constraint error. Guest user ID does not exist in auth.users.",
            "This means signInAnonymously() either failed or hasn't been called yet.",
            "Ensure anonymous sign-ins are enabled in Supabase Dashboard.",
            { userId, error }
          )
          return new Response(
            JSON.stringify({
              error: "Guest user authentication required",
              details:
                "Anonymous sign-ins must be enabled and signInAnonymously() must succeed first",
              code: error.code,
            }),
            { status: 400 }
          )
        }

        console.error("Error creating guest user in public.users:", error)
        return new Response(
          JSON.stringify({
            error: "Failed to create guest user profile",
            details: error?.message,
            code: error?.code,
          }),
          { status: 500 }
        )
      }

      userData = data
      console.log("Successfully created guest user profile for:", userId)
    } else {
      console.log("Guest user already exists:", userId)
    }

    return new Response(JSON.stringify({ user: userData }), { status: 200 })
  } catch (err: unknown) {
    console.error("Error in create-guest endpoint:", err)

    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}
