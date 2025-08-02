"use client"

import { SignIn, SignOut, User as UserIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSettings } from "@/lib/settings-store/provider"
import { useUser } from "@/lib/user-store/provider"

import { AppInfoTrigger } from "./app-info/app-info-trigger"
import { FeedbackTrigger } from "./feedback/feedback-trigger"
import { SettingsTrigger } from "./settings/settings-trigger"

export function UserMenu() {
  const { user, signOut } = useUser()
  const { isOpen: isSettingsOpen } = useSettings()
  const [isMenuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  const handleSettingsOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMenuOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/"
  }

  const isGuest = user.anonymous

  return (
    // fix shadcn/ui / radix bug when dialog into dropdown menu
    <DropdownMenu open={isMenuOpen} onOpenChange={setMenuOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger>
            <Avatar className="bg-background hover:bg-muted">
              {isGuest ? (
                <AvatarFallback>
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={user?.profile_image ?? undefined} />
                  <AvatarFallback>
                    {user?.display_name?.charAt(0)}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{isGuest ? "Guest User" : "Profile"}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        className="w-56"
        align="end"
        forceMount
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (isSettingsOpen) {
            e.preventDefault()
            return
          }
          setMenuOpen(false)
        }}
      >
        <DropdownMenuItem className="flex flex-col items-start gap-0 no-underline hover:bg-transparent focus:bg-transparent">
          <span>{isGuest ? "Guest User" : user?.display_name}</span>
          {!isGuest && (
            <span className="max-w-full truncate text-muted-foreground">
              {user?.email}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isGuest ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/auth" className="cursor-pointer">
                <SignIn className="mr-2 h-4 w-4" />
                <span>Sign In</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/auth" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Create Account</span>
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <SettingsTrigger onOpenChange={handleSettingsOpenChange} />
            <FeedbackTrigger />
            <AppInfoTrigger />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <SignOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
