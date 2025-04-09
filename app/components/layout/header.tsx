"use client"

import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { AppInfoTrigger } from "@/app/components/layout/app-info/app-info-trigger"
import { ButtonNewChat } from "@/app/components/layout/button-new-chat"
import { UserMenu } from "@/app/components/layout/user-menu"
import { useUser } from "@/app/providers/user-provider"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/config"
import { Info } from "@phosphor-icons/react"
import Link from "next/link"

export function Header() {
  const { user } = useUser()
  const isLoggedIn = !!user

  return (
    <header className="h-app-header fixed top-0 right-0 left-0 z-50">
      <div className="h-app-header top-app-header bg-background pointer-events-none absolute left-0 z-50 mx-auto w-full to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden"></div>
      <div className="bg-background relative mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <Link
          href="/"
          className="text-xl font-medium tracking-tight lowercase"
          prefetch
        >
          {APP_NAME}
        </Link>
        {!isLoggedIn ? (
          <div className="flex items-center gap-4">
            <AppInfoTrigger
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 hover:bg-muted text-muted-foreground h-8 w-8 rounded-full"
                  aria-label={`About ${APP_NAME}`}
                >
                  <Info className="size-4" />
                </Button>
              }
            />
            <Link
              href="/auth"
              className="font-base text-muted-foreground hover:text-foreground text-base transition-colors"
            >
              Login
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ButtonNewChat />
            <HistoryTrigger />
            <UserMenu />
          </div>
        )}
      </div>
    </header>
  )
}
