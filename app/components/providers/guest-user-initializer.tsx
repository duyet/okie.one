"use client"

import { useEffect, useRef } from "react"

import { initializeGuestUser } from "@/lib/user/guest"
import { useUser } from "@/lib/user-store/provider"

export function GuestUserInitializer() {
  const { user, updateUser } = useUser()
  const initializationAttempted = useRef(false)
  const initializationComplete = useRef(false)

  useEffect(() => {
    async function initGuest() {
      // Prevent multiple initialization attempts
      if (initializationAttempted.current) return

      // Skip if user is already loaded and not anonymous
      if (user?.id && !user.anonymous) {
        initializationComplete.current = true
        return
      }

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
          initializationComplete.current = true
        } else {
          console.warn("Failed to initialize guest user - no profile returned")
          // Reset the flag so we can try again if needed
          initializationAttempted.current = false
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

  // Force initialization to complete before allowing any other interactions
  useEffect(() => {
    if (!initializationComplete.current && !user?.id) {
      // For e2e tests - ensure we have a basic guest user immediately
      const ensureBasicGuestUser = async () => {
        const guestId =
          localStorage.getItem("guest-user-id") || crypto.randomUUID()
        const basicGuestProfile = {
          id: guestId,
          email: `${guestId}@anonymous.example`,
          display_name: "Guest User",
          profile_image: "",
          anonymous: true,
          created_at: new Date().toISOString(),
          daily_message_count: 0,
          daily_reset: null,
          favorite_models: null,
          message_count: 0,
          premium: false,
          last_active_at: new Date().toISOString(),
          daily_pro_message_count: 0,
          daily_pro_reset: null,
          system_prompt: null,
        }

        console.log(
          "Setting basic guest user for immediate e2e compatibility:",
          guestId
        )
        await updateUser(basicGuestProfile)
        initializationComplete.current = true
      }

      ensureBasicGuestUser()
    }
  }, [user?.id, updateUser])

  return null
}
