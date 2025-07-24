"use client"

import { Button } from "@/components/ui/button"
import { signInWithGoogle, signInWithGitHub } from "@/lib/api"
import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { HeaderGoBack } from "../components/header-go-back"

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSignInWithGoogle() {
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

  async function handleSignInWithGitHub() {
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
    <div className="flex h-dvh w-full flex-col bg-background">
      <HeaderGoBack href="/" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="font-medium text-3xl text-foreground tracking-tight sm:text-4xl">
              Welcome to {APP_NAME}
            </h1>
            <p className="mt-3 text-muted-foreground">
              Sign in below to increase your message limits.
            </p>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="mt-8 space-y-3">
            <Button
              variant="secondary"
              className="w-full text-base sm:text-base"
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
              <span>
                {loadingProvider === "google" ? "Connecting..." : "Continue with Google"}
              </span>
            </Button>
            <Button
              variant="secondary"
              className="w-full text-base sm:text-base"
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
              <span>
                {loadingProvider === "github" ? "Connecting..." : "Continue with GitHub"}
              </span>
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-muted-foreground text-sm">
        {/* @todo */}
        <p>
          By continuing, you agree to our{" "}
          <Link href="/" className="text-foreground hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/" className="text-foreground hover:underline">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  )
}
