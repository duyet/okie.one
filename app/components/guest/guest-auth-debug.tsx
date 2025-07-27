"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function GuestAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString()
    const log = data
      ? `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}`
      : `[${timestamp}] ${message}`
    setDebugInfo((prev) => [...prev, log])
    console.log(message, data)
  }

  const testAnonymousAuth = async () => {
    setIsLoading(true)
    setDebugInfo([])

    try {
      const supabase = createClient()

      if (!supabase) {
        addLog("❌ Supabase client not available")
        return
      }

      addLog("✅ Supabase client created")

      // Check current session
      const { data: session, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) {
        addLog("❌ Error getting session", sessionError)
      } else if (session?.session) {
        addLog("📍 Current session found", {
          userId: session.session.user.id,
          isAnonymous: session.session.user.is_anonymous,
          email: session.session.user.email,
        })
      } else {
        addLog("⚠️ No active session")
      }

      // Try anonymous sign-in
      addLog("🔄 Attempting anonymous sign-in...")
      const { data: anonData, error: anonError } =
        await supabase.auth.signInAnonymously()

      if (anonError) {
        addLog("❌ Anonymous sign-in failed", {
          error: anonError.message,
          status: anonError.status,
          name: anonError.name,
        })
      } else if (anonData?.user) {
        addLog("✅ Anonymous sign-in successful", {
          userId: anonData.user.id,
          isAnonymous: anonData.user.is_anonymous,
        })

        // Check if user exists in public.users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", anonData.user.id)
          .single()

        if (userError) {
          addLog("❌ User not found in public.users table", userError)
        } else {
          addLog("✅ User found in public.users table", userData)
        }
      }

      // Check localStorage
      addLog("📦 localStorage check", {
        "fallback-guest-id": localStorage.getItem("fallback-guest-id"),
        "guest-user-id": localStorage.getItem("guest-user-id"),
      })
    } catch (error) {
      addLog("❌ Unexpected error", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearGuestData = () => {
    localStorage.removeItem("fallback-guest-id")
    localStorage.removeItem("guest-user-id")
    localStorage.removeItem("guestUserId")
    addLog("🗑️ Cleared guest data from localStorage")
  }

  return (
    <Card className="mx-auto my-4 max-w-2xl">
      <CardHeader>
        <CardTitle>Guest Authentication Debug Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={testAnonymousAuth}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? "Testing..." : "Test Anonymous Auth"}
          </Button>
          <Button onClick={clearGuestData} variant="outline">
            Clear Guest Data
          </Button>
        </div>

        {debugInfo.length > 0 && (
          <div className="rounded-lg bg-muted p-4">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {debugInfo.join("\n")}
            </pre>
          </div>
        )}

        <div className="text-muted-foreground text-sm">
          <p>This tool helps debug guest authentication issues.</p>
          <p>
            If anonymous sign-in fails, check that it's enabled in Supabase
            Dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
