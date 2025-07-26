"use client"

import { useState } from "react"
import { X, SignIn, User } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/user-store/provider"
import Link from "next/link"

export function GuestUserBanner() {
  const { user } = useUser()
  const [dismissed, setDismissed] = useState(false)

  // Only show for guest users
  if (!user?.anonymous || dismissed) return null

  return (
    <div className="relative bg-secondary/50 border-b border-border px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-6xl mx-auto">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3">
          <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground sm:mt-0 sm:h-5 sm:w-5" />
          <div className="text-xs sm:text-sm">
            <span className="block text-foreground sm:inline">
              You&apos;re using a guest account.
            </span>
            <span className="block text-muted-foreground sm:ml-2 sm:inline">
              Sign in to save your chats permanently and access more features.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link href="/auth">
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1.5 px-3 text-xs sm:h-8 sm:gap-2 sm:text-sm"
            >
              <SignIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Sign In
            </Button>
          </Link>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
