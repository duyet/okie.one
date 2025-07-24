"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { signInWithGoogle, signInWithGitHub } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { useState } from "react"

type DialogAuthProps = {
  open: boolean
  setOpen: (open: boolean) => void
}

export function DialogAuth({ open, setOpen }: DialogAuthProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isSupabaseEnabled) {
    return null
  }

  const supabase = createClient()

  if (!supabase) {
    return null
  }

  const handleSignInWithGoogle = async () => {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            You&apos;ve reached the limit for today
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Sign in below to increase your message limits.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}
        <DialogFooter className="mt-6 sm:justify-center">
          <div className="w-full space-y-3">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
