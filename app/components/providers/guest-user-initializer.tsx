"use client"

import { useEffect } from "react"
import { useUser } from "@/lib/user-store/provider"
import { initializeGuestUser, getGuestUserProfile } from "@/lib/user/guest"

export function GuestUserInitializer() {
  const { user, updateUser } = useUser()

  useEffect(() => {
    async function initGuest() {
      // Skip if user is already loaded
      if (user?.id) return

      // Initialize guest user with persistent ID
      // This will check for existing IDs in localStorage, sessionStorage, and cookies
      const guestProfile = await initializeGuestUser()
      if (guestProfile) {
        // Update the user context
        await updateUser(guestProfile)
      }
    }

    initGuest()
  }, [user?.id, updateUser])

  return null
}