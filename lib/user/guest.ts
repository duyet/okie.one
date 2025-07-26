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
  if (supabase) {
    const { data: authData } = await supabase.auth.getUser()
    if (authData?.user && !authData.user.is_anonymous) {
      // User is authenticated, not a guest
      return null
    }
  }

  // Get or create guest user ID
  const guestId = await getOrCreateGuestUserId(null)
  if (!guestId) return null

  // Create guest profile
  const guestProfile: UserProfile = {
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

  return guestProfile
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
