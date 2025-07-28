/**
 * Generate a device fingerprint for guest user identification
 * This combines multiple browser characteristics to create a unique identifier
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = []

  // Screen properties
  components.push(`${screen.width}x${screen.height}`)
  components.push(`${screen.colorDepth}`)

  // Navigator properties
  components.push(navigator.userAgent)
  components.push(navigator.language)
  components.push(navigator.platform)
  components.push(`${navigator.hardwareConcurrency || 0}`)

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.textBaseline = "top"
      ctx.font = '14px "Arial"'
      ctx.textBaseline = "alphabetic"
      ctx.fillStyle = "#f60"
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = "#069"
      ctx.fillText("Guest Fingerprint", 2, 15)
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)"
      ctx.fillText("Guest Fingerprint", 4, 17)
      components.push(canvas.toDataURL())
    }
  } catch {
    components.push("canvas-unavailable")
  }

  // Create hash from components
  const fingerprint = components.join("|")
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(fingerprint)
  )
  const hashArray = Array.from(new Uint8Array(hash))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  // Format as UUID-like string for consistency
  return [
    hashHex.substring(0, 8),
    hashHex.substring(8, 12),
    `4${hashHex.substring(13, 16)}`, // Version 4 UUID format
    ((parseInt(hashHex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) +
      hashHex.substring(18, 20),
    hashHex.substring(20, 32),
  ].join("-")
}

/**
 * Get or create a persistent guest ID using multiple methods
 * Ensures consistency across all storage keys that e2e tests expect
 */
export async function getOrCreatePersistentGuestId(): Promise<string> {
  // Primary storage keys - e2e tests check these specific keys
  const primaryKeys = ["guest-user-id", "fallback-guest-id", "guestUserId"]

  // Try to get from localStorage first - check all keys to maintain consistency
  for (const key of primaryKeys) {
    const id = localStorage.getItem(key)

    // Handle old format guest IDs by migrating them
    if (id?.startsWith("guest-user-")) {
      console.log("Migrating old format guest ID to UUID:", id)
      const newId = crypto.randomUUID()
      // Update all primary keys to maintain consistency
      for (const updateKey of primaryKeys) {
        localStorage.setItem(updateKey, newId)
      }
      localStorage.setItem(`guest-id-migration-${id}`, newId)
      return newId
    }

    // Check if it's a valid UUID
    if (
      id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      // Found a valid ID, ensure all keys are synchronized
      for (const syncKey of primaryKeys) {
        if (localStorage.getItem(syncKey) !== id) {
          localStorage.setItem(syncKey, id)
        }
      }
      sessionStorage.setItem("guest-user-id", id)
      return id
    }
  }

  // Try sessionStorage
  const sessionId = sessionStorage.getItem("guest-user-id")
  if (
    sessionId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionId
    )
  ) {
    // Restore to all localStorage keys
    for (const key of primaryKeys) {
      localStorage.setItem(key, sessionId)
    }
    return sessionId
  }

  // Generate device fingerprint as fallback
  try {
    const fingerprintId = await generateDeviceFingerprint()

    // Check if we've seen this fingerprint before
    const storedFingerprints = localStorage.getItem("guest-fingerprints")
    const fingerprints = storedFingerprints
      ? JSON.parse(storedFingerprints)
      : {}

    if (fingerprints[fingerprintId]) {
      // We've seen this device before, use the stored ID
      const storedId = fingerprints[fingerprintId]
      // Store in all locations for consistency
      for (const key of primaryKeys) {
        localStorage.setItem(key, storedId)
      }
      sessionStorage.setItem("guest-user-id", storedId)
      return storedId
    }

    // New device, generate new UUID
    const newId = crypto.randomUUID()

    // Store the mapping
    fingerprints[fingerprintId] = newId
    localStorage.setItem("guest-fingerprints", JSON.stringify(fingerprints))

    // Store in all primary keys to ensure e2e tests can find it
    for (const key of primaryKeys) {
      localStorage.setItem(key, newId)
    }
    sessionStorage.setItem("guest-user-id", newId)

    return newId
  } catch (error) {
    console.error("Failed to generate device fingerprint:", error)
    // Fallback to random UUID
    const fallbackId = crypto.randomUUID()
    // Store in all primary keys
    for (const key of primaryKeys) {
      localStorage.setItem(key, fallbackId)
    }
    sessionStorage.setItem("guest-user-id", fallbackId)
    return fallbackId
  }
}
