import { getOrCreateGuestUserId } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"

import type { UserProfile } from "./types"

/**
 * Initialize guest user on client side
 * This ensures guest users have a persistent ID and profile
 */
export async function initializeGuestUser(): Promise<UserProfile | null> {
  console.log("Starting guest user initialization...")

  // Create fallback profile helper
  const createFallbackProfile = async (): Promise<UserProfile> => {
    const guestId = await getOrCreateGuestUserId(null)
    if (!guestId) {
      throw new Error("Failed to generate guest user ID")
    }

    console.log("Created fallback guest profile with ID:", guestId)
    return {
      id: guestId,
      email: `${guestId}@anonymous.example`,
      display_name: "Guest User",
      profile_image: "",
      anonymous: true,
      created_at: new Date().toISOString(),
      daily_message_count: 0,
      daily_reset: null,
      favorite_models: null,
      message_count: 0,
      premium: false,
      last_active_at: new Date().toISOString(),
      daily_pro_message_count: 0,
      daily_pro_reset: null,
      system_prompt: null,
    }
  }

  // Check if user is already authenticated
  const supabase = createClient()
  if (!supabase) {
    console.log("Supabase not available, using fallback guest profile")
    return await createFallbackProfile()
  }

  try {
    // Check if user is already authenticated
    const { data: authData } = await supabase.auth.getUser()
    if (authData?.user) {
      if (!authData.user.is_anonymous) {
        // User is authenticated, not a guest
        console.log("User is authenticated, not initializing guest user")
        return null
      }

      console.log("Found existing anonymous user:", authData.user.id)

      // User is already an anonymous user, try to get their profile
      const profile = await getGuestUserProfile(authData.user.id)
      if (profile) {
        console.log("Retrieved existing guest user profile")
        return profile
      }

      // Create profile in database for existing anonymous user
      try {
        console.log("Creating database profile for existing anonymous user")
        const { data, error } = await supabase
          .from("users")
          .insert({
            id: authData.user.id,
            email: authData.user.email || `${authData.user.id}@anonymous.local`,
            anonymous: true,
            message_count: 0,
            premium: false,
            created_at: new Date().toISOString(),
            display_name: "Guest User",
            favorite_models: [],
          })
          .select("*")
          .single()

        if (!error && data) {
          console.log(
            "Successfully created database profile for anonymous user"
          )
          return data as UserProfile
        } else {
          console.warn(
            "Failed to create database profile, using existing auth:",
            error
          )
          // Return a profile based on the auth user even if DB insert failed
          return {
            id: authData.user.id,
            email: authData.user.email || `${authData.user.id}@anonymous.local`,
            display_name: "Guest User",
            profile_image: "",
            anonymous: true,
            created_at: new Date().toISOString(),
            daily_message_count: 0,
            daily_reset: null,
            favorite_models: null,
            message_count: 0,
            premium: false,
            last_active_at: new Date().toISOString(),
            daily_pro_message_count: 0,
            daily_pro_reset: null,
            system_prompt: null,
          }
        }
      } catch (err) {
        console.error(
          "Error creating guest user profile for existing anonymous user:",
          err
        )
        // Still return a profile based on the auth user
        return {
          id: authData.user.id,
          email: authData.user.email || `${authData.user.id}@anonymous.local`,
          display_name: "Guest User",
          profile_image: "",
          anonymous: true,
          created_at: new Date().toISOString(),
          daily_message_count: 0,
          daily_reset: null,
          favorite_models: null,
          message_count: 0,
          premium: false,
          last_active_at: new Date().toISOString(),
          daily_pro_message_count: 0,
          daily_pro_reset: null,
          system_prompt: null,
        }
      }
    }

    // No existing session, try to sign in anonymously
    console.log("No existing session, attempting anonymous sign-in...")
    const { data: signInData, error: signInError } =
      await supabase.auth.signInAnonymously()

    if (signInError || !signInData?.user) {
      console.warn(
        "Anonymous sign-in failed, using fallback:",
        signInError?.message
      )
      return await createFallbackProfile()
    }

    // Successfully signed in anonymously, create profile in database
    console.log("Anonymous sign-in successful, creating profile...")
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: signInData.user.id,
          email:
            signInData.user.email || `${signInData.user.id}@anonymous.local`,
          anonymous: true,
          message_count: 0,
          premium: false,
          created_at: new Date().toISOString(),
          display_name: "Guest User",
          favorite_models: [],
        })
        .select("*")
        .single()

      if (!error && data) {
        console.log("Guest user profile created successfully in database")
        return data as UserProfile
      }

      // If insert failed due to duplicate, try to fetch existing profile
      if (error?.code === "23505") {
        const profile = await getGuestUserProfile(signInData.user.id)
        if (profile) {
          console.log("Found existing profile after duplicate error")
          return profile
        }
      }

      console.warn("Error creating guest user profile in database:", error)
    } catch (err) {
      console.error("Error creating guest user profile:", err)
    }

    // Return basic profile even if database insert failed
    console.log("Returning basic profile for anonymous user")
    return {
      id: signInData.user.id,
      email: signInData.user.email || `${signInData.user.id}@anonymous.local`,
      display_name: "Guest User",
      profile_image: "",
      anonymous: true,
      created_at: new Date().toISOString(),
      daily_message_count: 0,
      daily_reset: null,
      favorite_models: null,
      message_count: 0,
      premium: false,
      last_active_at: new Date().toISOString(),
      daily_pro_message_count: 0,
      daily_pro_reset: null,
      system_prompt: null,
    }
  } catch (error) {
    console.error("Error during guest user initialization:", error)
    // Fall back to local guest profile
    return await createFallbackProfile()
  }
}

/**
 * Get guest user profile from database if exists
 */
export async function getGuestUserProfile(
  guestId: string
): Promise<UserProfile | null> {
  const supabase = createClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", guestId)
    .eq("anonymous", true)
    .single()

  if (error || !data) return null

  return data as UserProfile
}
