"use client"

import {
  CheckCircleIcon,
  LinkIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabledClient } from "@/lib/supabase/config"
import { useUser } from "@/lib/user-store/provider"

type Provider = {
  id: string
  name: string
  icon: string
  isConnected: boolean
  isConnecting: boolean
}

// Define all available OAuth providers
const AVAILABLE_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    icon: "https://www.google.com/favicon.ico",
  },
  {
    id: "github",
    name: "GitHub",
    icon: "https://github.com/favicon.ico",
  },
] as const

export function SignInMethods() {
  const { user } = useUser()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserIdentities = useCallback(async () => {
    if (!isSupabaseEnabledClient || !user) {
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

      // Use getUserIdentities() to get all linked identities
      const { data: identitiesData, error: identitiesError } =
        await supabase.auth.getUserIdentities()

      if (identitiesError) {
        console.error("Error fetching user identities:", identitiesError)
        setError("Failed to load sign-in methods")
        return
      }

      // Get connected provider IDs
      const connectedProviderIds = new Set(
        identitiesData?.identities?.map((identity) => identity.provider) || []
      )

      // Map all available providers with their connection status
      const providersWithStatus: Provider[] = AVAILABLE_PROVIDERS.map(
        (provider) => ({
          id: provider.id,
          name: provider.name,
          icon: provider.icon,
          isConnected: connectedProviderIds.has(provider.id),
          isConnecting: false,
        })
      )

      setProviders(providersWithStatus)
      setError(null)
    } catch (error) {
      console.error("Error fetching user identities:", error)
      setError("Failed to load sign-in methods")
    } finally {
      setLoading(false)
    }
  }, [user])

  const handleConnectProvider = async (providerId: string) => {
    if (!isSupabaseEnabledClient) return

    // Set connecting state for this provider
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, isConnecting: true } : p))
    )

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error("Supabase client not available")
      }

      // Call linkIdentity to connect the new provider
      const { data, error } = await supabase.auth.linkIdentity({
        provider: providerId as "google" | "github",
      })

      if (error) {
        console.error(`Error linking ${providerId} identity:`, error)

        // Handle specific error cases
        if (error.message.includes("Manual linking is not enabled")) {
          setError("Account linking is not enabled. Please contact support.")
        } else if (error.message.includes("already linked")) {
          setError(
            `${AVAILABLE_PROVIDERS.find((p) => p.id === providerId)?.name} account is already linked.`
          )
        } else {
          setError(
            `Failed to connect ${AVAILABLE_PROVIDERS.find((p) => p.id === providerId)?.name}. Please try again.`
          )
        }
        return
      }

      // If successful, redirect to OAuth provider
      if (data?.url) {
        // The user will be redirected to OAuth provider
        // After successful auth, they'll come back and identities will be updated
        window.location.href = data.url
      }
    } catch (error) {
      console.error(`Error connecting ${providerId}:`, error)
      setError(
        `Failed to connect ${AVAILABLE_PROVIDERS.find((p) => p.id === providerId)?.name}. Please try again.`
      )
    } finally {
      // Reset connecting state
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId ? { ...p, isConnecting: false } : p
        )
      )
    }
  }

  // Fetch identities on mount and when user changes
  useEffect(() => {
    fetchUserIdentities()
  }, [fetchUserIdentities])

  // Refresh identities when page regains focus (after OAuth redirect)
  useEffect(() => {
    const handleFocus = () => {
      fetchUserIdentities()
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [fetchUserIdentities])

  if (!isSupabaseEnabledClient || !user) {
    return null
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-medium text-sm">
        <ShieldCheckIcon className="size-4" />
        Sign-in methods
      </h3>

      {error && (
        <div className="mb-3 rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 px-2 text-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground text-sm">
          Loading sign-in methods...
        </div>
      ) : (
        <div className="space-y-3">
          <p className="mb-3 text-muted-foreground text-xs">
            Connect multiple providers to access your account using any of these
            methods:
          </p>
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={provider.icon}
                  alt={`${provider.name} logo`}
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
                <div>
                  <div className="font-medium text-sm">{provider.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {provider.isConnected ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>

              {provider.isConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircleIcon className="size-4" />
                  <span className="font-medium text-xs">Active</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectProvider(provider.id)}
                  disabled={provider.isConnecting}
                  className="flex items-center gap-1"
                >
                  {provider.isConnecting ? (
                    <>
                      <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                      <span className="text-xs">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="size-3" />
                      <span className="text-xs">Connect</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
