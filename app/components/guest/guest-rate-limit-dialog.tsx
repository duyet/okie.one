"use client"

import { SignIn, Sparkle } from "@phosphor-icons/react"
import Link from "next/link"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { NON_AUTH_DAILY_MESSAGE_LIMIT } from "@/lib/config"

interface GuestRateLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messagesUsed?: number
}

export function GuestRateLimitDialog({
  open,
  onOpenChange,
  messagesUsed = NON_AUTH_DAILY_MESSAGE_LIMIT,
}: GuestRateLimitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-yellow-500" />
            Daily limit reached
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You&apos;ve used all {messagesUsed} free messages for today as a
              guest user.
            </p>
            <p className="font-medium">Sign in to continue chatting with:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>1,000 messages per day for free accounts</li>
              <li>Keep all your chat history</li>
              <li>Access to more AI models</li>
              <li>Upload files and images</li>
              <li>Save your preferences</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Link href="/auth" className="w-full sm:w-auto">
            <Button className="w-full gap-2">
              <SignIn className="h-4 w-4" />
              Sign in to continue
            </Button>
          </Link>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
