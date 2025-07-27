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

          // Try to create the guest user in the database
          console.log("Attempting to create guest user in database:", userId)
          const { data: newUser, error: createError } = await supabase
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
            .select("id")
            .single()

          if (createError) {
            console.error("Error creating guest user:", createError)
            if (createError.code === "23503") {
              console.log(
                "Foreign key constraint error. Guest user ID does not exist in auth.users.",
                "This is expected if anonymous auth is not enabled or the migration hasn't been applied.",
                "Apply the migration in supabase/migrations/20240000000001_fix_guest_users_fk.sql"
              )
            }
          } else if (newUser) {
            console.log("Guest user created successfully:", userId)
          }

          // Return the supabase client regardless
          // If the migration is applied, the user will be created
          // If not, at least read operations will work
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
