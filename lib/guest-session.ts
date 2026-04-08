/**
 * Guest Session Management
 *
 * Consolidated guest session handling with single source of truth
 * Migrates old localStorage keys to unified key
 */

import { authLogger } from "./logger"

export const GUEST_SESSION_KEY = "okie_guest_id"
export const GUEST_SESSION_COOKIE = "okie_guest_session"

/**
 * Legacy localStorage keys that need migration
 */
const LEGACY_KEYS = [
  "guest-user-id",
  "fallback-guest-id",
  "guestUserId",
] as const

/**
 * Get the current guest session ID
 * - Tries new unified key first
 * - Falls back to legacy keys for migration
 * - Validates UUID format
 *
 * @returns Valid UUID guest session ID or null
 */
export function getGuestSessionId(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  // Try unified key first
  const unifiedId = localStorage.getItem(GUEST_SESSION_KEY)
  if (unifiedId && isValidUUID(unifiedId)) {
    authLogger.debug("Using unified guest session ID", { sessionId: unifiedId })
    return unifiedId
  }

  // Fallback to legacy keys for migration
  for (const key of LEGACY_KEYS) {
    const legacyId = localStorage.getItem(key)
    if (legacyId) {
      // Handle old format guest IDs
      if (legacyId.startsWith("guest-user-")) {
        authLogger.warn("Old format guest ID detected, migrating", {
          oldId: legacyId,
        })
        const newId = generateUUID()
        setGuestSessionId(newId)
        // Clean up old key
        localStorage.removeItem(key)
        // Store migration record for debugging
        localStorage.setItem(`guest-id-migration-${legacyId}`, newId)
        return newId
      }

      // Validate UUID format
      if (isValidUUID(legacyId)) {
        authLogger.debug("Migrating legacy guest session ID", {
          legacyKey: key,
          sessionId: legacyId,
        })
        // Migrate to unified key
        setGuestSessionId(legacyId)
        // Clean up legacy key
        localStorage.removeItem(key)
        return legacyId
      }

      // Invalid format, clean up
      authLogger.warn("Invalid guest ID format in legacy key, removing", {
        key,
        value: legacyId,
      })
      localStorage.removeItem(key)
    }
  }

  // No valid session ID found
  authLogger.debug("No valid guest session ID found")
  return null
}

/**
 * Set the guest session ID
 * Stores in unified key only
 *
 * @param sessionId - Valid UUID to store as guest session ID
 */
export function setGuestSessionId(sessionId: string): void {
  if (typeof window === "undefined") {
    return
  }

  if (!isValidUUID(sessionId)) {
    authLogger.error("Attempted to set invalid guest session ID", {
      sessionId,
    })
    throw new Error("Invalid guest session ID format. Must be a valid UUID.")
  }

  localStorage.setItem(GUEST_SESSION_KEY, sessionId)
  authLogger.debug("Guest session ID stored", { sessionId })
}

/**
 * Clear guest session data
 * Removes all guest-related localStorage entries
 */
export function clearGuestSession(): void {
  if (typeof window === "undefined") {
    return
  }

  // Remove unified key
  localStorage.removeItem(GUEST_SESSION_KEY)

  // Clean up any remaining legacy keys
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }

  // Clean up migration records
  const migrationKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith("guest-id-migration-")
  )
  for (const key of migrationKeys) {
    localStorage.removeItem(key)
  }

  authLogger.debug("Guest session cleared")
}

/**
 * Validate UUID format
 *
 * @param id - String to validate as UUID
 * @returns True if valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Generate a random UUID v4
 * Uses crypto.randomUUID() with fallback
 *
 * @returns New UUID v4 string
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get or create guest session ID
 * Returns existing valid ID or generates new one
 *
 * @returns Valid UUID guest session ID
 */
export function getOrCreateGuestSessionId(): string {
  const existingId = getGuestSessionId()
  if (existingId) {
    return existingId
  }

  const newId = generateUUID()
  setGuestSessionId(newId)
  authLogger.debug("Created new guest session ID", { sessionId: newId })
  return newId
}
