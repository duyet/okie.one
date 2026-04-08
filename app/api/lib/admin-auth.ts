/**
 * Admin Authentication Utility
 *
 * Provides admin authorization checks for protected API routes
 * Uses ADMIN_EMAILS environment variable for access control
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { analyticsLogger } from "@/lib/logger"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || []

/**
 * Checks if the current user is an admin
 * Returns NextResponse with 403 if not authorized, null if authorized
 *
 * @returns NextResponse | null - Returns error response or null if authorized
 */
export async function adminCheck(): Promise<NextResponse | null> {
  // Allow in development if no admin emails configured
  if (process.env.NODE_ENV === "development" && ADMIN_EMAILS.length === 0) {
    analyticsLogger.warn("Admin check bypassed in development (no ADMIN_EMAILS configured)")
    return null
  }

  // Check if admin emails are configured in production
  if (ADMIN_EMAILS.length === 0) {
    analyticsLogger.error("Admin access denied: No admin emails configured")
    return NextResponse.json({ error: "Admin access not configured" }, { status: 500 })
  }

  const supabase = await createClient()

  if (!supabase) {
    analyticsLogger.error("Admin check failed: Database connection failed")
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
  }

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    analyticsLogger.error("Admin check failed: Auth error", { error: error.message })
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }

  if (!user || !user.email) {
    analyticsLogger.warn("Admin access denied: No authenticated user")
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const userEmail = user.email.toLowerCase()
  const isAdmin = ADMIN_EMAILS.includes(userEmail)

  if (!isAdmin) {
    analyticsLogger.warn("Admin access denied: Unauthorized user", { email: userEmail })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  analyticsLogger.debug("Admin access granted", { email: userEmail })
  return null
}

/**
 * Helper function to check if a user is an admin without returning a response
 * Useful for conditional logic in API routes
 *
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const response = await adminCheck()
  return response === null
}

/**
 * Gets the current admin user's email
 * Returns null if not authenticated or not an admin
 *
 * @returns Promise<string | null> - Admin email or null
 */
export async function getAdminEmail(): Promise<string | null> {
  if (process.env.NODE_ENV === "development" && ADMIN_EMAILS.length === 0) {
    return "development@local"
  }

  const supabase = await createClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) return null

  const userEmail = user.email.toLowerCase()
  return ADMIN_EMAILS.includes(userEmail) ? userEmail : null
}
