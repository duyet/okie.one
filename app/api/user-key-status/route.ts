import { NextResponse } from "next/server"

import { PROVIDERS } from "@/lib/providers"
import { createClient } from "@/lib/supabase/server"

const SUPPORTED_PROVIDERS = PROVIDERS.map((p) => p.id)

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      // Return empty provider status for environments without Supabase
      const providerStatus = SUPPORTED_PROVIDERS.reduce(
        (acc, provider) => {
          acc[provider] = false
          return acc
        },
        {} as Record<string, boolean>
      )
      return NextResponse.json(providerStatus)
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      // Return empty provider status for guest users
      const providerStatus = SUPPORTED_PROVIDERS.reduce(
        (acc, provider) => {
          acc[provider] = false
          return acc
        },
        {} as Record<string, boolean>
      )
      return NextResponse.json(providerStatus)
    }

    const { data, error } = await supabase
      .from("user_keys")
      .select("provider")
      .eq("user_id", authData.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create status object for all supported providers
    const userProviders = data?.map((k) => k.provider) || []
    const providerStatus = SUPPORTED_PROVIDERS.reduce(
      (acc, provider) => {
        acc[provider] = userProviders.includes(provider)
        return acc
      },
      {} as Record<string, boolean>
    )

    return NextResponse.json(providerStatus)
  } catch (err) {
    console.error("Key status error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
