/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  generateDeviceFingerprint,
  getOrCreatePersistentGuestId,
} from "../guest-fingerprint"

// Mock the DOM APIs
const mockScreen = {
  width: 1920,
  height: 1080,
  colorDepth: 24,
}

const mockNavigator = {
  userAgent: "Mozilla/5.0 Test Browser",
  language: "en-US",
  platform: "MacIntel",
  hardwareConcurrency: 8,
}

// Mock canvas
class MockCanvasRenderingContext2D {
  textBaseline: string = ""
  font: string = ""
  fillStyle: string = ""

  fillRect = vi.fn()
  fillText = vi.fn()
}

class MockHTMLCanvasElement {
  getContext = vi.fn(() => new MockCanvasRenderingContext2D())
  toDataURL = vi.fn(() => "data:image/png;base64,mock")
}

describe("guest-fingerprint", () => {
  beforeEach(() => {
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()

    // Mock DOM APIs
    Object.defineProperty(window, "screen", {
      value: mockScreen,
      writable: true,
    })

    Object.defineProperty(window, "navigator", {
      value: mockNavigator,
      writable: true,
    })

    // Mock document.createElement for canvas
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        if (tagName === "canvas") {
          return new MockHTMLCanvasElement() as unknown as HTMLCanvasElement
        }
        return document.createElement(tagName)
      }
    )

    // Mock Intl.DateTimeFormat
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => ({
      resolvedOptions: () =>
        ({
          timeZone: "America/New_York",
          locale: "en-US",
          calendar: "gregory",
          numberingSystem: "latn",
        }) as Intl.ResolvedDateTimeFormatOptions,
      format: vi.fn(),
      formatToParts: vi.fn(),
      formatRange: vi.fn(),
      formatRangeToParts: vi.fn(),
    }))

    // Mock crypto.subtle.digest
    const mockDigest = vi
      .fn()
      .mockResolvedValue(
        new Uint8Array([
          0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56,
          0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc,
          0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
        ])
      )

    Object.defineProperty(window.crypto, "subtle", {
      value: { digest: mockDigest },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("generateDeviceFingerprint", () => {
    it("should generate a consistent UUID-format fingerprint", async () => {
      const fingerprint = await generateDeviceFingerprint()

      // Check UUID format
      expect(fingerprint).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it("should generate the same fingerprint for the same device", async () => {
      const fingerprint1 = await generateDeviceFingerprint()
      const fingerprint2 = await generateDeviceFingerprint()

      expect(fingerprint1).toBe(fingerprint2)
    })

    it("should handle canvas errors gracefully", async () => {
      // Mock canvas to throw error
      vi.spyOn(document, "createElement").mockImplementation(() => {
        throw new Error("Canvas not supported")
      })

      const fingerprint = await generateDeviceFingerprint()

      // Should still generate a valid UUID
      expect(fingerprint).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })
  })

  describe("getOrCreatePersistentGuestId", () => {
    it("should return existing guest ID from localStorage", async () => {
      const existingId = "123e4567-e89b-12d3-a456-426614174000"
      localStorage.setItem("guest-user-id", existingId)

      const guestId = await getOrCreatePersistentGuestId()

      expect(guestId).toBe(existingId)
    })

    it("should return existing guest ID from sessionStorage if not in localStorage", async () => {
      const sessionId = "123e4567-e89b-12d3-a456-426614174001"
      sessionStorage.setItem("guest-user-id", sessionId)

      const guestId = await getOrCreatePersistentGuestId()

      expect(guestId).toBe(sessionId)
      // Should also restore to localStorage
      expect(localStorage.getItem("guest-user-id")).toBe(sessionId)
    })

    it("should ignore invalid IDs and generate new one", async () => {
      localStorage.setItem("guest-user-id", "invalid-id")

      const guestId = await getOrCreatePersistentGuestId()

      // Should be a valid UUID
      expect(guestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      expect(guestId).not.toBe("invalid-id")
    })

    it("should use fingerprint mapping if available", async () => {
      const mappedId = "123e4567-e89b-12d3-a456-426614174002"
      const fingerprint = await generateDeviceFingerprint()

      // Pre-store fingerprint mapping
      localStorage.setItem(
        "guest-fingerprints",
        JSON.stringify({
          [fingerprint]: mappedId,
        })
      )

      const guestId = await getOrCreatePersistentGuestId()

      expect(guestId).toBe(mappedId)
    })

    it("should create new ID and store fingerprint mapping", async () => {
      const guestId = await getOrCreatePersistentGuestId()

      // Should be a valid UUID
      expect(guestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )

      // Should store in all locations
      expect(localStorage.getItem("guest-user-id")).toBe(guestId)
      expect(localStorage.getItem("fallback-guest-id")).toBe(guestId)
      expect(sessionStorage.getItem("guest-user-id")).toBe(guestId)

      // Should store fingerprint mapping
      const fingerprints = JSON.parse(
        localStorage.getItem("guest-fingerprints") || "{}"
      )
      expect(Object.values(fingerprints)).toContain(guestId)
    })

    it("should handle crypto.randomUUID fallback", async () => {
      // Mock crypto.subtle.digest to fail
      vi.spyOn(window.crypto.subtle, "digest").mockRejectedValue(
        new Error("Crypto not supported")
      )

      const guestId = await getOrCreatePersistentGuestId()

      // Should still generate a valid UUID
      expect(guestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })
  })

  describe("persistence across sessions", () => {
    it("should maintain same ID when localStorage is cleared but fingerprint matches", async () => {
      // First session - generate ID
      const firstSessionId = await getOrCreatePersistentGuestId()

      // Get the fingerprint mapping before clearing
      const fingerprintMapping = localStorage.getItem("guest-fingerprints")

      // Simulate browser restart - clear localStorage except fingerprints
      localStorage.clear()
      if (fingerprintMapping) {
        localStorage.setItem("guest-fingerprints", fingerprintMapping)
      }

      // Second session - should recover same ID
      const secondSessionId = await getOrCreatePersistentGuestId()

      expect(secondSessionId).toBe(firstSessionId)
    })
  })
})
