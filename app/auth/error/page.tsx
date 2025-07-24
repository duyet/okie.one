"use client"

import { ArrowLeft } from "@phosphor-icons/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

// Create a separate component that uses useSearchParams
function AuthErrorContent() {
  const searchParams = useSearchParams()
  const message =
    searchParams.get("message") || "An error occurred during authentication."
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")
  const [isLinking, setIsLinking] = useState(false)
  const [linkingError, setLinkingError] = useState<string | null>(null)

  // Check if this is the multiple accounts error
  const isMultipleAccountsError =
    message.includes("Multiple accounts with the same email") ||
    errorDescription?.includes("Multiple accounts with the same email") ||
    errorCode === "unexpected_failure"

  const handleLinkAccount = async (provider: "google" | "github") => {
    const supabase = createClient()

    if (!supabase) {
      setLinkingError("Authentication service not available")
      return
    }

    try {
      setIsLinking(true)
      setLinkingError(null)

      const { data, error } = await supabase.auth.linkIdentity({ provider })

      if (error) {
        throw error
      }

      // User will be redirected to OAuth provider
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      console.error(`Error linking ${provider} account:`, err)
      setLinkingError(
        (err as Error).message || "Failed to link account. Please try again."
      )
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="font-medium text-3xl text-white tracking-tight sm:text-4xl">
          Authentication Error
        </h1>

        {isMultipleAccountsError ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-4">
              <h3 className="font-medium text-amber-300 text-sm mb-2">
                Account Linking Issue
              </h3>
              <p className="text-amber-200 text-sm text-left">
                You've tried to sign in with a different provider using an email
                that's already associated with another account.
              </p>
            </div>

            <div className="rounded-md bg-zinc-700/50 p-4 text-left">
              <h4 className="font-medium text-white text-sm mb-2">
                How to fix this:
              </h4>
              <ol className="text-zinc-300 text-sm list-decimal list-inside space-y-1">
                <li>Try signing in with the original provider you used</li>
                <li>
                  If unsure, try both Google and GitHub with the same email
                </li>
                <li>Or link your accounts using the options below</li>
              </ol>
            </div>

            {/* Account Linking Options */}
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-4">
              <h4 className="font-medium text-blue-300 text-sm mb-3">
                Link Your Accounts
              </h4>
              <p className="text-blue-200 text-sm mb-4">
                Already signed in? Link your Google or GitHub account to use
                both providers:
              </p>

              {linkingError && (
                <div className="mb-3 rounded-md bg-red-500/10 border border-red-500/20 p-2">
                  <p className="text-red-300 text-sm">{linkingError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleLinkAccount("google")}
                  disabled={isLinking}
                >
                  {isLinking ? "Linking..." : "Link Google Account"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleLinkAccount("github")}
                  disabled={isLinking}
                >
                  {isLinking ? "Linking..." : "Link GitHub Account"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-md bg-red-500/10 p-4">
            <p className="text-red-400">{message}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Button
            variant="secondary"
            className="w-full text-base sm:text-base"
            size="lg"
            asChild
          >
            <Link href="/auth">Try Again</Link>
          </Button>
          <Button
            variant="outline"
            className="w-full text-base sm:text-base"
            size="lg"
            asChild
          >
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="flex h-screen flex-col bg-zinc-800 text-white">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-white hover:bg-zinc-700"
        >
          <ArrowLeft className="size-5 text-white" />
          <span className="ml-2 hidden font-base text-sm sm:inline-block">
            Back to Chat
          </span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <Suspense fallback={<div>Loading...</div>}>
          <AuthErrorContent />
        </Suspense>
      </main>

      <footer className="py-6 text-center text-sm text-zinc-500">
        <p>
          Need help? {/* @todo */}
          <Link href="/" className="text-zinc-400 hover:underline">
            Contact Support
          </Link>
        </p>
      </footer>
    </div>
  )
}
