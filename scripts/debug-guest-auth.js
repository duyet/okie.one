// Debug script to test guest user authentication
// Run this in the browser console to diagnose issues

async function debugGuestAuth() {
  console.log("=== Guest User Authentication Debug ===")

  // Check if Supabase is available
  const { createClient } = await import("/lib/supabase/client")
  const supabase = createClient()

  if (!supabase) {
    console.error("❌ Supabase client not available")
    return
  }

  console.log("✅ Supabase client created")

  // Check current auth session
  const { data: session, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError) {
    console.error("❌ Error getting session:", sessionError)
  } else if (session?.session) {
    console.log("✅ Current session:", {
      userId: session.session.user.id,
      isAnonymous: session.session.user.is_anonymous,
      email: session.session.user.email,
    })
  } else {
    console.log("⚠️ No active session")
  }

  // Try anonymous sign-in
  console.log("\n--- Attempting anonymous sign-in ---")
  const { data: anonData, error: anonError } =
    await supabase.auth.signInAnonymously()

  if (anonError) {
    console.error("❌ Anonymous sign-in failed:", anonError)
    console.error(
      "Make sure anonymous sign-ins are enabled in Supabase Dashboard:"
    )
    console.error("Authentication > Providers > Anonymous Sign-Ins")
  } else if (anonData?.user) {
    console.log("✅ Anonymous sign-in successful:", {
      userId: anonData.user.id,
      isAnonymous: anonData.user.is_anonymous,
    })

    // Check if user exists in public.users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", anonData.user.id)
      .single()

    if (userError) {
      console.error("❌ User not found in public.users table:", userError)
    } else {
      console.log("✅ User found in public.users table:", userData)
    }
  }

  // Check localStorage
  console.log("\n--- localStorage check ---")
  const fallbackGuestId = localStorage.getItem("fallback-guest-id")
  const guestUserId = localStorage.getItem("guest-user-id")
  console.log("fallback-guest-id:", fallbackGuestId)
  console.log("guest-user-id:", guestUserId)

  console.log("\n=== End Debug ===")
}

// Run the debug function
debugGuestAuth()
