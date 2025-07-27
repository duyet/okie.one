/**
 * Test to verify guest user storage fixes work correctly
 * This test simulates the behavior expected by e2e tests
 */
import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => "12345678-1234-4123-8234-123456789012")

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
})

Object.defineProperty(global, "sessionStorage", {
  value: sessionStorageMock,
})

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: mockRandomUUID,
  },
})

// Mock the getOrCreatePersistentGuestId function
import { getOrCreatePersistentGuestId } from "@/lib/user/guest-fingerprint"

describe("Guest User Storage Fixes", () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
    mockRandomUUID.mockClear()
  })

  it("should create guest ID in all primary storage keys", async () => {
    const guestId = await getOrCreatePersistentGuestId()

    expect(guestId).toBe("12345678-1234-4123-8234-123456789012")

    // Verify all primary keys are set
    expect(localStorageMock.getItem("guest-user-id")).toBe(guestId)
    expect(localStorageMock.getItem("fallback-guest-id")).toBe(guestId)
    expect(localStorageMock.getItem("guestUserId")).toBe(guestId)
    expect(sessionStorageMock.getItem("guest-user-id")).toBe(guestId)
  })

  it("should persist guest ID across page reloads (like e2e test expects)", async () => {
    // First, create a guest ID
    const guestId1 = await getOrCreatePersistentGuestId()

    // Simulate page reload - sessionStorage is cleared but localStorage persists
    sessionStorageMock.clear()

    // Get guest ID again - should be the same
    const guestId2 = await getOrCreatePersistentGuestId()

    expect(guestId2).toBe(guestId1)
    expect(guestId2).toBe("12345678-1234-4123-8234-123456789012")
  })

  it("should handle old format guest IDs and migrate them", async () => {
    // Set an old format guest ID
    localStorageMock.setItem("guest-user-id", "guest-user-old-format")

    const guestId = await getOrCreatePersistentGuestId()

    // Should create a new UUID and store it in all primary keys
    expect(guestId).toBe("12345678-1234-4123-8234-123456789012")
    expect(localStorageMock.getItem("guest-user-id")).toBe(guestId)
    expect(localStorageMock.getItem("fallback-guest-id")).toBe(guestId)
    expect(localStorageMock.getItem("guestUserId")).toBe(guestId)

    // Should store migration mapping
    expect(
      localStorageMock.getItem("guest-id-migration-guest-user-old-format")
    ).toBe(guestId)
  })

  it("should synchronize all storage keys when one has a valid UUID", async () => {
    const existingGuestId = "98765432-1234-4123-8234-987654321098"

    // Only set one key initially
    localStorageMock.setItem("guest-user-id", existingGuestId)

    const guestId = await getOrCreatePersistentGuestId()

    // Should return the existing ID and sync to all keys
    expect(guestId).toBe(existingGuestId)
    expect(localStorageMock.getItem("guest-user-id")).toBe(existingGuestId)
    expect(localStorageMock.getItem("fallback-guest-id")).toBe(existingGuestId)
    expect(localStorageMock.getItem("guestUserId")).toBe(existingGuestId)
    expect(sessionStorageMock.getItem("guest-user-id")).toBe(existingGuestId)
  })

  it("should handle session storage recovery", async () => {
    const sessionGuestId = "11111111-1234-4123-8234-111111111111"

    // Clear localStorage but set sessionStorage
    localStorageMock.clear()
    sessionStorageMock.setItem("guest-user-id", sessionGuestId)

    const guestId = await getOrCreatePersistentGuestId()

    // Should restore from sessionStorage to all localStorage keys
    expect(guestId).toBe(sessionGuestId)
    expect(localStorageMock.getItem("guest-user-id")).toBe(sessionGuestId)
    expect(localStorageMock.getItem("fallback-guest-id")).toBe(sessionGuestId)
    expect(localStorageMock.getItem("guestUserId")).toBe(sessionGuestId)
  })
})
