import { useEffect } from "react"
import { useUser } from "@/lib/user-store/provider"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"

export function useGuestDataMerge() {
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    async function mergeGuestData() {
      // Only run if user is authenticated (not anonymous)
      if (!user?.id || user.anonymous) return

      // Check if there's a stored guest user ID
      const guestUserId = localStorage.getItem("guest-user-id")
      if (!guestUserId || !guestUserId.startsWith("guest-")) return

      // Check if we've already attempted a merge for this user
      const mergeAttemptedKey = `merge-attempted-${user.id}`
      if (localStorage.getItem(mergeAttemptedKey)) return

      try {
        // Mark that we're attempting a merge
        localStorage.setItem(mergeAttemptedKey, "true")

        const response = await fetch("/api/merge-guest-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ guestUserId }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          // Clear the guest user ID
          localStorage.removeItem("guest-user-id")
          localStorage.removeItem(`guestProfileAttempted_${guestUserId}`)

          toast({
            title: "Welcome back!",
            description: "Your previous chats have been restored.",
            status: "success",
          })

          // Refresh the page to reload all data
          router.refresh()
        } else {
          console.error("Failed to merge guest data:", data.error)
          // Remove the merge attempt marker on failure so it can be retried
          localStorage.removeItem(mergeAttemptedKey)
        }
      } catch (error) {
        console.error("Error merging guest data:", error)
        // Remove the merge attempt marker on error so it can be retried
        localStorage.removeItem(mergeAttemptedKey)
      }
    }

    mergeGuestData()
  }, [user, router])
}
