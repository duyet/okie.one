import { isSupabaseEnabled } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import {
  convertFromApiFormat,
  defaultPreferences,
  type LayoutType,
} from "@/lib/user-preference-store/utils"

import type { UserProfile } from "./types"

export async function getSupabaseUser() {
  const supabase = await createClient()
  if (!supabase) return { supabase: null, user: null }

  const { data } = await supabase.auth.getUser()
  return {
    supabase,
    user: data.user ?? null,
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  if (!isSupabaseEnabled) {
    // return fake user profile for no supabase
    return {
      id: "guest",
      email: "guest@okie.one",
      display_name: "Guest",
      profile_image: "",
      anonymous: true,
      preferences: defaultPreferences,
    } as UserProfile
  }

  const { supabase, user } = await getSupabaseUser()
  if (!supabase || !user) return null

  const { data: userProfileData } = await supabase
    .from("users")
    .select("*, user_preferences(*)")
    .eq("id", user.id)
    .single()

  // Handle anonymous users - return their profile instead of null
  if (userProfileData?.anonymous) {
    // Format user preferences if they exist
    const formattedPreferences = userProfileData?.user_preferences
      ? convertFromApiFormat({
          layout: userProfileData.user_preferences.layout as LayoutType | null,
          prompt_suggestions:
            userProfileData.user_preferences.prompt_suggestions,
          show_tool_invocations:
            userProfileData.user_preferences.show_tool_invocations,
          show_conversation_previews:
            userProfileData.user_preferences.show_conversation_previews,
          multi_model_enabled:
            userProfileData.user_preferences.multi_model_enabled,
          hidden_models: userProfileData.user_preferences.hidden_models,
        })
      : undefined

    return {
      ...userProfileData,
      profile_image: "",
      display_name: "Guest User",
      preferences: formattedPreferences || defaultPreferences,
    } as UserProfile
  }

  // Format user preferences if they exist
  const formattedPreferences = userProfileData?.user_preferences
    ? convertFromApiFormat({
        layout: userProfileData.user_preferences.layout as LayoutType | null,
        prompt_suggestions: userProfileData.user_preferences.prompt_suggestions,
        show_tool_invocations:
          userProfileData.user_preferences.show_tool_invocations,
        show_conversation_previews:
          userProfileData.user_preferences.show_conversation_previews,
        multi_model_enabled:
          userProfileData.user_preferences.multi_model_enabled,
        hidden_models: userProfileData.user_preferences.hidden_models,
      })
    : undefined

  return {
    ...userProfileData,
    profile_image: user.user_metadata?.avatar_url ?? "",
    display_name: user.user_metadata?.name ?? "",
    preferences: formattedPreferences,
  } as UserProfile
}
