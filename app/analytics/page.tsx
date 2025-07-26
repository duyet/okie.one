import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { createClient } from "@/lib/supabase/server"

import { TokenAnalytics } from "./token-usage"

export const metadata: Metadata = {
  title: "Analytics - Token Usage Dashboard",
  description: "View your AI token usage analytics and daily leaderboard",
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/auth")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className="flex h-full flex-col pt-app-header">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <h1 className="font-semibold text-lg">Analytics</h1>
              <div className="ml-auto flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">
                  Track your AI usage, costs, and performance metrics
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-8">
              <TokenAnalytics userId={user.id} showLeaderboard={true} />
            </div>
          </div>
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
