import { describe, expect, it, vi } from "vitest"

// Test utility functions
describe("Utility Functions", () => {
  describe("String utilities", () => {
    it("should handle empty strings", () => {
      expect("").toBe("")
    })

    it("should handle string manipulation", () => {
      const testString = "Hello World"
      expect(testString.toLowerCase()).toBe("hello world")
      expect(testString.toUpperCase()).toBe("HELLO WORLD")
    })
  })

  describe("Array utilities", () => {
    it("should handle array operations", () => {
      const testArray = [1, 2, 3, 4, 5]
      expect(testArray.length).toBe(5)
      expect(testArray.includes(3)).toBe(true)
      expect(testArray.filter((n) => n > 3)).toEqual([4, 5])
    })
  })

  describe("Object utilities", () => {
    it("should handle object operations", () => {
      const testObj = { a: 1, b: 2, c: 3 }
      expect(Object.keys(testObj)).toEqual(["a", "b", "c"])
      expect(Object.values(testObj)).toEqual([1, 2, 3])
    })
  })
})

// Test actual lib utils
describe("Lib Utils Integration", () => {
  describe("cn() function", () => {
    it("should merge class names correctly", async () => {
      const { cn } = await import("@/lib/utils")

      // Test basic merging
      expect(cn("class1", "class2")).toBe("class1 class2")

      // Test with conditional classes
      expect(cn("base", true && "conditional")).toBe("base conditional")
      expect(cn("base", false && "conditional")).toBe("base")

      // Test with objects
      expect(cn({ active: true, inactive: false })).toBe("active")

      // Test tailwind merge functionality
      expect(cn("px-4", "px-2")).toBe("px-2") // Later px should override
    })

    it("should handle empty and undefined inputs", async () => {
      const { cn } = await import("@/lib/utils")

      expect(cn()).toBe("")
      expect(cn(undefined)).toBe("")
      expect(cn(null)).toBe("")
      expect(cn("")).toBe("")
    })
  })

  describe("formatNumber() function", () => {
    it("should format numbers with commas", async () => {
      const { formatNumber } = await import("@/lib/utils")

      expect(formatNumber(1000)).toBe("1,000")
      expect(formatNumber(1234567)).toBe("1,234,567")
      expect(formatNumber(100)).toBe("100")
      expect(formatNumber(0)).toBe("0")
    })

    it("should handle negative numbers", async () => {
      const { formatNumber } = await import("@/lib/utils")

      expect(formatNumber(-1000)).toBe("-1,000")
      expect(formatNumber(-1234567)).toBe("-1,234,567")
    })

    it("should handle decimal numbers", async () => {
      const { formatNumber } = await import("@/lib/utils")

      expect(formatNumber(1000.5)).toBe("1,000.5")
      expect(formatNumber(1234567.89)).toBe("1,234,567.89")
    })
  })

  describe("debounce() function", () => {
    it("should delay function execution", async () => {
      const { debounce } = await import("@/lib/utils")

      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call immediately
      debouncedFn("test")
      expect(mockFn).not.toHaveBeenCalled()

      // Wait for debounce delay using a Promise
      await new Promise((resolve) => setTimeout(resolve, 110))

      // Check that the function was called
      expect(mockFn).toHaveBeenCalledWith("test")
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it("should cancel previous timeout when called again", async () => {
      const { debounce } = await import("@/lib/utils")

      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call multiple times quickly
      debouncedFn("first")
      debouncedFn("second")
      debouncedFn("third")

      // Should only call with the last argument
      await vi.waitFor(
        () => {
          expect(mockFn).toHaveBeenCalledTimes(1)
          expect(mockFn).toHaveBeenCalledWith("third")
        },
        { timeout: 150 }
      )
    })

    it("should preserve function arguments and context", async () => {
      const { debounce } = await import("@/lib/utils")

      const mockFn = vi.fn((a: string, b: number) => a + b)
      const debouncedFn = debounce(
        mockFn as (...args: unknown[]) => unknown,
        50
      )

      debouncedFn("test", 123)

      await vi.waitFor(
        () => {
          expect(mockFn).toHaveBeenCalledWith("test", 123)
        },
        { timeout: 100 }
      )
    })
  })

  describe("isDev constant", () => {
    it("should reflect NODE_ENV environment", async () => {
      const { isDev } = await import("@/lib/utils")

      // In test environment, NODE_ENV should be 'test'
      expect(typeof isDev).toBe("boolean")
      expect(isDev).toBe(process.env.NODE_ENV === "development")
    })
  })
})
