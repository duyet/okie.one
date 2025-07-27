"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@/lib/user-store/provider"
import { initializeGuestUser } from "@/lib/user/guest"

export function GuestUserInitializer() {
  const { user, updateUser } = useUser()
  const initializationAttempted = useRef(false)

  useEffect(() => {
    async function initGuest() {
      // Prevent multiple initialization attempts
      if (initializationAttempted.current) return

      // Skip if user is already loaded and not anonymous
      if (user?.id && !user.anonymous) return

      try {
        initializationAttempted.current = true

        console.log("Initializing guest user...")

        // Initialize guest user with persistent ID
        // This will check for existing IDs in localStorage, sessionStorage, and cookies
        const guestProfile = await initializeGuestUser()

        if (guestProfile) {
          console.log("Guest user initialized successfully:", guestProfile.id)
          // Update the user context
          await updateUser(guestProfile)
        } else {
          console.warn("Failed to initialize guest user - no profile returned")
        }
      } catch (error) {
        console.error("Error during guest user initialization:", error)
        // Reset the flag so we can try again if needed
        initializationAttempted.current = false
      }
    }

    // Run initialization immediately and on user changes
    initGuest()
  }, [user?.id, user?.anonymous, updateUser])

  // Also ensure guest ID exists in localStorage immediately for e2e tests
  useEffect(() => {
    const ensureGuestId = () => {
      const primaryKeys = ["guest-user-id", "fallback-guest-id", "guestUserId"]
      let hasValidId = false

      // Check if any primary key has a valid UUID
      for (const key of primaryKeys) {
        const id = localStorage.getItem(key)
        if (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        ) {
          hasValidId = true
          // Sync this ID to all other keys
          for (const syncKey of primaryKeys) {
            if (localStorage.getItem(syncKey) !== id) {
              localStorage.setItem(syncKey, id)
            }
          }
          break
        }
      }

      // If no valid ID exists, create one immediately
      if (!hasValidId) {
        const newId = crypto.randomUUID()
        console.log("Creating immediate guest ID for e2e compatibility:", newId)
        for (const key of primaryKeys) {
          localStorage.setItem(key, newId)
        }
        sessionStorage.setItem("guest-user-id", newId)
      }
    }

    // Run this synchronously for immediate availability
    ensureGuestId()
  }, [])

  return null
}
