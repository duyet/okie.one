import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">Token Usage Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Track your AI usage, costs, and performance metrics
        </p>
      </div>

      <TokenAnalytics userId={user.id} showLeaderboard={true} />
    </div>
  )
}