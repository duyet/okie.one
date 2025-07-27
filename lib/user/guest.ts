import { createClient } from "@/lib/supabase/client"
import { getOrCreateGuestUserId } from "@/lib/api"
import type { UserProfile } from "./types"

/**
 * Initialize guest user on client side
 * This ensures guest users have a persistent ID and profile
 */
export async function initializeGuestUser(): Promise<UserProfile | null> {
  // Check if user is already authenticated
  const supabase = createClient()
  if (!supabase) {
    // If Supabase is not available, return a local guest profile
    const guestId = await getOrCreateGuestUserId(null)
    if (!guestId) return null

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
  const { data: authData } = await supabase.auth.getUser()
  if (authData?.user) {
    if (!authData.user.is_anonymous) {
      // User is authenticated, not a guest
      return null
    }

    // User is already an anonymous user, try to get their profile
    const profile = await getGuestUserProfile(authData.user.id)
    if (profile) {
      return profile
    }

    // Create profile in database for existing anonymous user
    try {
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
        return data as UserProfile
      }
    } catch (err) {
      console.error("Error creating guest user profile:", err)
    }
  }

  // No existing session, sign in anonymously
  console.log("No existing session, attempting anonymous sign-in...")
  const { data: signInData, error: signInError } =
    await supabase.auth.signInAnonymously()

  if (signInError || !signInData?.user) {
    console.error("Anonymous sign-in failed:", signInError)

    // Fall back to local guest ID
    const guestId = await getOrCreateGuestUserId(null)
    if (!guestId) return null

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

  // Successfully signed in anonymously, create profile in database
  console.log("Anonymous sign-in successful, creating profile...")
  try {
    const { data, error } = await supabase
      .from("users")
      .insert({
        id: signInData.user.id,
        email: signInData.user.email || `${signInData.user.id}@anonymous.local`,
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
      console.log("Guest user profile created successfully")
      return data as UserProfile
    }

    // If insert failed due to duplicate, try to fetch existing profile
    if (error?.code === "23505") {
      const profile = await getGuestUserProfile(signInData.user.id)
      if (profile) {
        return profile
      }
    }

    console.error("Error creating guest user profile:", error)
  } catch (err) {
    console.error("Error creating guest user profile:", err)
  }

  // Return basic profile even if database insert failed
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
