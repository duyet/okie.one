"use client"

import { Button } from "@/components/ui/button"
import { PopoverContent } from "@/components/ui/popover"
import { signInWithGoogle, signInWithGitHub } from "@/lib/api"
import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import Image from "next/image"
import { useState } from "react"

export function PopoverContentAuth() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isSupabaseEnabled) {
    return null
  }

  const handleSignInWithGoogle = async () => {
    const supabase = createClient()

    if (!supabase) {
      throw new Error("Supabase is not configured")
    }

    try {
      setLoadingProvider("google")
      setError(null)

      const data = await signInWithGoogle(supabase)

      // Redirect to the provider URL
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      console.error("Error signing in with Google:", err)
      setError(
        (err as Error).message ||
          "An unexpected error occurred. Please try again."
      )
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleSignInWithGitHub = async () => {
    const supabase = createClient()

    if (!supabase) {
      throw new Error("Supabase is not configured")
    }

    try {
      setLoadingProvider("github")
      setError(null)

      const data = await signInWithGitHub(supabase)

      // Redirect to the provider URL
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      console.error("Error signing in with GitHub:", err)
      setError(
        (err as Error).message ||
          "An unexpected error occurred. Please try again."
      )
    } finally {
      setLoadingProvider(null)
    }
  }
  return (
    <PopoverContent
      className="w-[300px] overflow-hidden rounded-xl p-0"
      side="top"
      align="start"
    >
      <Image
        src="/banner_forest.jpg"
        alt={`calm paint generate by ${APP_NAME}`}
        width={300}
        height={128}
        className="h-32 w-full object-cover"
      />
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="p-3">
        <p className="mb-1 font-medium text-base text-primary">
          Login to try more features for free
        </p>
        <p className="mb-5 text-base text-muted-foreground">
          Add files, use more models, BYOK, and more.
        </p>
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full text-base"
            size="lg"
            onClick={handleSignInWithGoogle}
            disabled={loadingProvider === "google"}
          >
            <Image
              src="https://www.google.com/favicon.ico"
              alt="Google logo"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>{loadingProvider === "google" ? "Connecting..." : "Continue with Google"}</span>
          </Button>
          <Button
            variant="secondary"
            className="w-full text-base"
            size="lg"
            onClick={handleSignInWithGitHub}
            disabled={loadingProvider === "github"}
          >
            <Image
              src="https://github.com/favicon.ico"
              alt="GitHub logo"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>{loadingProvider === "github" ? "Connecting..." : "Continue with GitHub"}</span>
          </Button>
        </div>
      </div>
    </PopoverContent>
  )
}
