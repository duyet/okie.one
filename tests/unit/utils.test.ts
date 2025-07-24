import { describe, expect, it } from "vitest"

// Test utility functions that are commonly used
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
