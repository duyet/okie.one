import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"

import { isSupabaseEnabled } from "../supabase/config"

/**
 * Validates the user's identity
 * @param userId - The ID of the user.
 * @param isAuthenticated - Whether the user is authenticated.
 * @returns The Supabase client.
 */
export async function validateUserIdentity(
  userId: string,
  isAuthenticated: boolean
) {
  // Check for fallback guest users first, regardless of Supabase configuration
  if (!isAuthenticated && userId) {
    // Handle both old format (guest-user-xxx) and new format (UUID)
    const isOldFormatGuest = userId.startsWith("guest-user-")
    const isValidUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId
      )

    if (isOldFormatGuest || isValidUUID) {
      console.log("Processing fallback guest user:", userId)

      // For old format guest IDs, reject with clear error message
      if (isOldFormatGuest) {
        console.log(
          "Old format guest ID detected, client should migrate to UUID format"
        )
        throw new Error(
          "Invalid guest user ID format. Please refresh the page to get a new guest ID."
        )
      }

      // Ensure guest users exist in the database (handles both old format migrated to UUID and new UUID)
      if (isSupabaseEnabled) {
        const supabase = await createGuestServerClient()
        if (supabase) {
          // Check if this guest user already exists in the database
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", userId)
            .maybeSingle()

          // If user doesn't exist, create them on first message
          if (!existingUser) {
            const { error: insertError } = await supabase.from("users").insert({
              id: userId,
              anonymous: true,
              display_name: "Guest User",
              email: `${userId}@anonymous.example`,
              created_at: new Date().toISOString(),
            })

            if (insertError) {
              console.error(
                "Failed to create fallback guest user in DB:",
                insertError
              )
              // Still return the supabase client to allow operation to continue
            } else {
              console.log("Created fallback guest user in database:", userId)
            }
          }

          return supabase
        }
      }

      return null // Signal: valid guest user, no Supabase available
    }
  }

  if (!isSupabaseEnabled) {
    // For non-Supabase deployments, validate remaining cases
    if (!userId) {
      throw new Error("Missing user ID")
    }

    if (isAuthenticated) {
      throw new Error("Authentication not available without Supabase")
    }

    throw new Error("Invalid guest user ID format")
  }

  const supabase = isAuthenticated
    ? await createClient()
    : await createGuestServerClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  if (isAuthenticated) {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user?.id) {
      throw new Error("Unable to get authenticated user")
    }

    if (authData.user.id !== userId) {
      throw new Error("User ID does not match authenticated user")
    }
  } else {
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("anonymous", true)
      .maybeSingle()

    if (userError || !userRecord) {
      throw new Error("Invalid or missing guest user")
    }
  }

  return supabase
}
