import { MODEL_DEFAULT } from "@/lib/config"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  
  // Check for direct error parameters (from OAuth provider)
  const oauthError = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")

  if (!isSupabaseEnabled) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Supabase is not enabled in this deployment.")}`
    )
  }

  // Handle direct error parameters from OAuth provider
  if (oauthError) {
    const errorParams = new URLSearchParams()
    errorParams.set("message", oauthError)
    if (errorCode) errorParams.set("error_code", errorCode)
    if (errorDescription) errorParams.set("error_description", decodeURIComponent(errorDescription))
    
    return NextResponse.redirect(`${origin}/auth/error?${errorParams.toString()}`)
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Missing authentication code")}`
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = await createGuestServerClient()

  if (!supabase || !supabaseAdmin) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Supabase is not enabled in this deployment.")}`
    )
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Auth error:", error)
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    )
  }

  const user = data?.user
  if (!user || !user.id || !user.email) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Missing user info")}`
    )
  }

  try {
    // Try to insert user only if not exists
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: user.id,
      email: user.email,
      created_at: new Date().toISOString(),
      message_count: 0,
      premium: false,
      favorite_models: [MODEL_DEFAULT],
    })

    if (insertError && insertError.code !== "23505") {
      console.error("Error inserting user:", insertError)
    }
  } catch (err) {
    console.error("Unexpected user insert error:", err)
  }

  const host = request.headers.get("host")
  const protocol = host?.includes("localhost") ? "http" : "https"

  const redirectUrl = `${protocol}://${host}${next}`

  return NextResponse.redirect(redirectUrl)
}
