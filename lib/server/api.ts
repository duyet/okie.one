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

      // For fallback guest users (when anonymous auth is disabled or fails)
      if (isSupabaseEnabled) {
        const supabase = await createGuestServerClient()
        if (supabase) {
          // Check if this guest user already exists in the database
          // (may have been created by a previous successful anonymous auth)
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", userId)
            .maybeSingle()

          if (existingUser) {
            console.log("Found existing guest user in database:", userId)
            return supabase
          }

          // Guest user exists in auth.users but not in public.users
          // This shouldn't happen with proper anonymous auth, but handle gracefully
          console.log(
            "Guest user not found in database. Anonymous authentication may not be properly configured.",
            "Please enable anonymous authentication in Supabase Dashboard."
          )

          // Return the supabase client for read operations
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
    // For guest users, check if they exist in the users table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("anonymous", true)
      .maybeSingle()

    if (userError) {
      console.error("Error checking guest user:", userError)
      throw new Error("Database error when validating guest user")
    }

    if (!userRecord) {
      console.log(
        "Guest user not found in database, this should not happen if anonymous auth is properly configured"
      )
      // Don't throw an error, just log it. The chat creation should still work
      // since the guest user might be created through the trigger or other means
    }
  }

  return supabase
}
