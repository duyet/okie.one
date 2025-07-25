import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Encryption Library", () => {
  const originalEnv = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    // Set a test encryption key - must be exactly 32 bytes when decoded
    const key32Bytes = Buffer.alloc(32, "test-key-for-encryption-12345678")
    process.env.ENCRYPTION_KEY = key32Bytes.toString("base64")
  })

  afterEach(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv
  })

  describe("encryptKey() function", () => {
    it("should encrypt data and return encrypted string with IV", async () => {
      const { encryptKey } = await import("@/lib/encryption")

      const plaintext = "sk-test-api-key-12345"
      const result = encryptKey(plaintext)

      expect(result).toHaveProperty("encrypted")
      expect(result).toHaveProperty("iv")
      expect(typeof result.encrypted).toBe("string")
      expect(typeof result.iv).toBe("string")
      expect(result.encrypted.length).toBeGreaterThan(0)
      expect(result.iv.length).toBe(32) // 16 bytes as hex = 32 chars
    })

    it("should produce different results for same input", async () => {
      const { encryptKey } = await import("@/lib/encryption")

      const plaintext = "test-data"
      const result1 = encryptKey(plaintext)
      const result2 = encryptKey(plaintext)

      // Different IV should produce different encrypted results
      expect(result1.encrypted).not.toBe(result2.encrypted)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it("should handle empty strings", async () => {
      const { encryptKey } = await import("@/lib/encryption")

      const result = encryptKey("")
      expect(result.encrypted).toBeDefined()
      expect(result.iv).toBeDefined()
    })
  })

  describe("decryptKey() function", () => {
    it("should decrypt encrypted data correctly", async () => {
      const { encryptKey, decryptKey } = await import("@/lib/encryption")

      const plaintext = "sk-test-api-key-12345"
      const encrypted = encryptKey(plaintext)
      const decrypted = decryptKey(encrypted.encrypted, encrypted.iv)

      expect(decrypted).toBe(plaintext)
    })

    it("should handle various data types", async () => {
      const { encryptKey, decryptKey } = await import("@/lib/encryption")

      const testCases = [
        "simple-string",
        "sk-1234567890abcdef",
        '{"key": "value"}',
        "special-chars-!@#$%^&*()",
      ]

      for (const testCase of testCases) {
        const encrypted = encryptKey(testCase)
        const decrypted = decryptKey(encrypted.encrypted, encrypted.iv)
        expect(decrypted).toBe(testCase)
      }
    })

    it("should throw error for invalid encrypted data", async () => {
      const { decryptKey } = await import("@/lib/encryption")

      expect(() => {
        decryptKey("invalid-data", "invalid-iv")
      }).toThrow()
    })

    it("should throw error for malformed encrypted data", async () => {
      const { decryptKey } = await import("@/lib/encryption")

      // Missing auth tag separator
      expect(() => {
        decryptKey("invaliddata", "1234567890abcdef1234567890abcdef")
      }).toThrow()
    })
  })

  describe("isEncryptionAvailable() function", () => {
    it("should return true when ENCRYPTION_KEY is properly set", async () => {
      const { isEncryptionAvailable } = await import("@/lib/encryption")

      expect(isEncryptionAvailable()).toBe(true)
    })

    it("should return false when ENCRYPTION_KEY is missing", async () => {
      delete process.env.ENCRYPTION_KEY

      // Clear module cache and re-import
      vi.resetModules()
      const encryptionModule = await import("@/lib/encryption")

      expect(encryptionModule.isEncryptionAvailable()).toBe(false)
    })

    it("should return false when ENCRYPTION_KEY is invalid length", async () => {
      // Set a key that's too short when decoded
      process.env.ENCRYPTION_KEY = Buffer.from("short-key").toString("base64")

      // Clear module cache and re-import
      vi.resetModules()
      const encryptionModule = await import("@/lib/encryption")

      expect(encryptionModule.isEncryptionAvailable()).toBe(false)
    })
  })

  describe("maskKey() function", () => {
    it("should mask API keys correctly", async () => {
      const { maskKey } = await import("@/lib/encryption")

      const key = "sk-1234567890abcdef1234567890abcdef"
      const masked = maskKey(key)

      expect(masked).toBe(`sk-1${"*".repeat(27)}cdef`)
      expect(masked.length).toBe(key.length)
      expect(masked.startsWith("sk-1")).toBe(true)
      expect(masked.endsWith("cdef")).toBe(true)
    })

    it("should handle short keys", async () => {
      const { maskKey } = await import("@/lib/encryption")

      const shortKey = "sk-123"
      const masked = maskKey(shortKey)

      expect(masked).toBe("******")
      expect(masked.length).toBe(shortKey.length)
    })

    it("should handle edge case lengths", async () => {
      const { maskKey } = await import("@/lib/encryption")

      // Exactly 8 characters
      const eightChar = "12345678"
      expect(maskKey(eightChar)).toBe("********")

      // 9 characters (first case where we show first/last 4)
      const nineChar = "123456789"
      expect(maskKey(nineChar)).toBe("1234*6789")
    })

    it("should handle empty and single character strings", async () => {
      const { maskKey } = await import("@/lib/encryption")

      expect(maskKey("")).toBe("")
      expect(maskKey("a")).toBe("*")
    })
  })

  describe("Error handling", () => {
    it("should throw meaningful error when ENCRYPTION_KEY is missing", async () => {
      delete process.env.ENCRYPTION_KEY

      vi.resetModules()
      const { encryptKey } = await import("@/lib/encryption")

      expect(() => {
        encryptKey("test")
      }).toThrow("ENCRYPTION_KEY is required")
    })

    it("should throw meaningful error when ENCRYPTION_KEY is wrong length", async () => {
      process.env.ENCRYPTION_KEY =
        Buffer.from("wrong-length-key").toString("base64")

      vi.resetModules()
      const { encryptKey } = await import("@/lib/encryption")

      expect(() => {
        encryptKey("test")
      }).toThrow("ENCRYPTION_KEY must be 32 bytes long")
    })
  })
})
