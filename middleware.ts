import { type NextRequest, NextResponse } from "next/server"

import { updateSession } from "@/utils/supabase/middleware"

import { validateCsrfToken } from "./lib/csrf"

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Bypass CSRF protection for E2E tests
  const isTestMode =
    process.env.NODE_ENV === "test" ||
    process.env.BYPASS_AUTH_FOR_TESTS === "true"

  // CSRF protection for state-changing requests
  if (!isTestMode && ["POST", "PUT", "DELETE"].includes(request.method)) {
    const csrfCookie = request.cookies.get("csrf_token")?.value
    const headerToken = request.headers.get("x-csrf-token")

    // Critical: Compare cookie value with header value to prevent token substitution attacks
    if (
      !csrfCookie ||
      !headerToken ||
      csrfCookie !== headerToken ||
      !validateCsrfToken(headerToken)
    ) {
      // Log security violation for monitoring
      console.warn("[SECURITY] CSRF validation failed", {
        method: request.method,
        path: request.nextUrl,
        hasCookie: !!csrfCookie,
        hasHeader: !!headerToken,
      })
      return new NextResponse("Invalid CSRF token", { status: 403 })
    }
  }

  // CSP for development and production
  const isDev = process.env.NODE_ENV === "development"

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : ""

  response.headers.set(
    "Content-Security-Policy",
    isDev
      ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api.supabase.com ${supabaseDomain} https://api.github.com;`
      : `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://analytics.umami.is https://vercel.live; frame-src 'self' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api.supabase.com ${supabaseDomain} https://api-gateway.umami.dev https://api.github.com;`
  )

  return response
}

export const config = {
  matcher: [
    // Include API routes for CSRF protection (fixes critical security issue)
    "/api/:path*",
    // Page routes for other middleware
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}
