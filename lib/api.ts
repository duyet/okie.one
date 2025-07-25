import { APP_DOMAIN } from "@/lib/config"

/**
 * Get the appropriate base URL for OAuth redirects based on environment
 *
 * Environment detection priority:
 * 1. Local development: localhost:3000
 * 2. Vercel production (VERCEL_ENV=production): Uses VERCEL_PROJECT_PRODUCTION_URL
 * 3. Vercel preview (VERCEL_ENV=preview): Uses VERCEL_URL for branch previews
 * 4. Fallback: window.location.origin or APP_DOMAIN
 *
 * Environment Variables:
 * - VERCEL_ENV: "production" | "preview" | "development"
 * - VERCEL_PROJECT_PRODUCTION_URL / NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: Custom production domain
 * - VERCEL_URL / NEXT_PUBLIC_VERCEL_URL: Auto-generated Vercel domain (for previews)
 */
function getOAuthBaseUrl(): string {
  // Always use localhost for local development
  if (
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && window.location.hostname === "localhost")
  ) {
    return "http://localhost:3000"
  }

  // Check if we're running in Vercel environment using VERCEL_ENV
  const vercelEnv = process.env.VERCEL_ENV

  if (vercelEnv) {
    if (vercelEnv === "production") {
      // For production deployments, use the custom production domain
      const productionUrl =
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL

      if (productionUrl) {
        return `https://${productionUrl}`
      }
    } else if (vercelEnv === "preview") {
      // For preview deployments, use the auto-generated Vercel URL
      const previewUrl =
        process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL

      if (previewUrl) {
        return `https://${previewUrl}`
      }
    }
    // Note: vercelEnv === "development" would be local dev, handled above
  }

  // Fallback: Check if we're in any Vercel environment (legacy detection)
  const isVercel =
    process.env.VERCEL === "1" || process.env.NEXT_PUBLIC_VERCEL_URL

  if (isVercel) {
    // Legacy fallback - use production URL if available
    const productionUrl =
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL

    if (productionUrl) {
      return `https://${productionUrl}`
    }
  }

  // For non-Vercel deployments or when Vercel env vars aren't available,
  // use the current domain (browser origin) or configured domain
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Server-side fallback to configured domain
  return APP_DOMAIN || "https://okie.one"
}

/**
 * Generic OAuth sign-in function
 * Abstracts common OAuth logic to reduce duplication
 */
async function signInWithOAuth(
  supabase: SupabaseClient,
  provider: "google" | "github",
  additionalOptions?: Record<string, unknown>
) {
  try {
    const baseUrl = getOAuthBaseUrl()
    const redirectTo = `${baseUrl}/auth/callback`

    // Debug logging for development
    if (process.env.NODE_ENV === "development") {
      console.log(`OAuth ${provider} redirect URL:`, redirectTo)
      console.log("NODE_ENV:", process.env.NODE_ENV)
      console.log("VERCEL_ENV:", process.env.VERCEL_ENV)
      console.log("VERCEL:", process.env.VERCEL)
      console.log("VERCEL_URL:", process.env.VERCEL_URL)
      console.log("NEXT_PUBLIC_VERCEL_URL:", process.env.NEXT_PUBLIC_VERCEL_URL)
      console.log(
        "VERCEL_PROJECT_PRODUCTION_URL:",
        process.env.VERCEL_PROJECT_PRODUCTION_URL
      )
      console.log(
        "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:",
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      )
      console.log(
        "window.location:",
        typeof window !== "undefined"
          ? window.location.href
          : "N/A (server-side)"
      )
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...additionalOptions,
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (err) {
    console.error(`Error signing in with ${provider}:`, err)
    throw err
  }
}

import type { SupabaseClient } from "@supabase/supabase-js"

import type { UserProfile } from "@/lib/user/types"

import { fetchClient } from "./fetch"
import { API_ROUTE_CREATE_GUEST, API_ROUTE_UPDATE_CHAT_MODEL } from "./routes"
import { createClient } from "./supabase/client"

/**
 * Creates a guest user record on the server
 */
export async function createGuestUser(guestId: string) {
  try {
    const res = await fetchClient(API_ROUTE_CREATE_GUEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: guestId }),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to create guest user: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (err) {
    console.error("Error creating guest user:", err)
    throw err
  }
}

export class UsageLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_LIMIT_REACHED"
  }
}

/**
 * Checks the user's daily usage and increments both overall and daily counters.
 * Resets the daily counter if a new day (UTC) is detected.
 * Uses the `anonymous` flag from the user record to decide which daily limit applies.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @returns The remaining daily limit.
 */
export async function checkRateLimits(
  userId: string,
  isAuthenticated: boolean
) {
  try {
    const res = await fetchClient(
      `/api/rate-limits?userId=${userId}&isAuthenticated=${isAuthenticated}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    )
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to check rate limits: ${res.status} ${res.statusText}`
      )
    }
    return responseData
  } catch (err) {
    console.error("Error checking rate limits:", err)
    throw err
  }
}

/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

/**
 * Signs in user with Google OAuth via Supabase
 */
export async function signInWithGoogle(supabase: SupabaseClient) {
  return signInWithOAuth(supabase, "google", {
    queryParams: {
      access_type: "offline",
      prompt: "consent",
    },
  })
}

/**
 * Signs in user with GitHub OAuth via Supabase
 */
export async function signInWithGitHub(supabase: SupabaseClient) {
  return signInWithOAuth(supabase, "github")
}

export const getOrCreateGuestUserId = async (
  user: UserProfile | null
): Promise<string | null> => {
  if (user?.id) return user.id

  const supabase = createClient()

  if (!supabase) {
    console.warn("Supabase is not available in this deployment.")
    // Return a consistent guest user ID for non-Supabase deployments
    // Use localStorage to maintain consistent ID across sessions
    let fallbackGuestId = localStorage.getItem("fallback-guest-id")
    if (!fallbackGuestId) {
      fallbackGuestId = `guest-user-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("fallback-guest-id", fallbackGuestId)
    }
    return fallbackGuestId
  }

  // Test if Supabase is actually accessible by trying to get existing user
  try {
    const existingGuestSessionUser = await supabase.auth.getUser()

    if (existingGuestSessionUser.data?.user?.is_anonymous) {
      const anonUserId = existingGuestSessionUser.data.user.id

      const profileCreationAttempted = localStorage.getItem(
        `guestProfileAttempted_${anonUserId}`
      )

      if (!profileCreationAttempted) {
        try {
          await createGuestUser(anonUserId)
          localStorage.setItem(`guestProfileAttempted_${anonUserId}`, "true")
        } catch (error) {
          console.error(
            "Failed to ensure guest user profile exists for existing anonymous auth user:",
            error
          )
          // Fall back to manual guest ID
          let fallbackGuestId = localStorage.getItem("fallback-guest-id")
          if (!fallbackGuestId) {
            fallbackGuestId = `guest-user-${Math.random().toString(36).substr(2, 9)}`
            localStorage.setItem("fallback-guest-id", fallbackGuestId)
          }
          return fallbackGuestId
        }
      }
      return anonUserId
    }

    // Try to create a new anonymous user
    const { data: anonAuthData, error: anonAuthError } =
      await supabase.auth.signInAnonymously()

    if (anonAuthError) {
      console.error("Error during anonymous sign-in:", anonAuthError)
      // Fall back to manual guest ID
      let fallbackGuestId = localStorage.getItem("fallback-guest-id")
      if (!fallbackGuestId) {
        fallbackGuestId = `guest-user-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem("fallback-guest-id", fallbackGuestId)
      }
      return fallbackGuestId
    }

    if (!anonAuthData || !anonAuthData.user) {
      console.error("Anonymous sign-in did not return a user.")
      // Fall back to manual guest ID
      let fallbackGuestId = localStorage.getItem("fallback-guest-id")
      if (!fallbackGuestId) {
        fallbackGuestId = `guest-user-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem("fallback-guest-id", fallbackGuestId)
      }
      return fallbackGuestId
    }

    const guestIdFromAuth = anonAuthData.user.id
    try {
      await createGuestUser(guestIdFromAuth)
      localStorage.setItem(`guestProfileAttempted_${guestIdFromAuth}`, "true")
      return guestIdFromAuth
    } catch (error) {
      console.error("Error creating guest user profile:", error)
      // Fall back to manual guest ID
      let fallbackGuestId = localStorage.getItem("fallback-guest-id")
      if (!fallbackGuestId) {
        fallbackGuestId = `guest-user-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem("fallback-guest-id", fallbackGuestId)
      }
      return fallbackGuestId
    }
  } catch (error) {
    console.error(
      "Supabase connection failed, falling back to manual guest ID:",
      error
    )
    // Supabase is configured but not accessible - use fallback
    let fallbackGuestId = localStorage.getItem("fallback-guest-id")
    if (!fallbackGuestId) {
      fallbackGuestId = `guest-user-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("fallback-guest-id", fallbackGuestId)
    }
    return fallbackGuestId
  }
}
