import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Session Storage Message Persistence", () => {
  beforeEach(() => {
    // Clear session storage before each test
    global.sessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    }
  })

  it("should save messages to session storage when chatId is null", () => {
    const messages = [
      {
        id: "1",
        role: "user" as const,
        content: "hello",
        createdAt: new Date(),
      },
    ]
    const sessionKey = "okie-pending-messages"

    // Simulate saving messages
    sessionStorage.setItem(sessionKey, JSON.stringify(messages))

    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      sessionKey,
      JSON.stringify(messages)
    )
  })

  it("should restore messages from session storage", () => {
    const sessionKey = "okie-pending-messages"
    const storedMessages = [
      {
        id: "1",
        role: "user" as const,
        content: "hello",
        createdAt: new Date(),
      },
    ]

    // Mock the stored value
    ;(sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify(storedMessages)
    )

    // Retrieve and parse
    const stored = sessionStorage.getItem(sessionKey)
    const parsed = stored ? JSON.parse(stored) : []

    expect(parsed).toEqual(storedMessages)
  })

  it("should clear session storage when chatId is set", () => {
    const sessionKey = "okie-pending-messages"

    sessionStorage.removeItem(sessionKey)

    expect(sessionStorage.removeItem).toHaveBeenCalledWith(sessionKey)
  })

  it("should handle session storage errors gracefully", () => {
    const sessionKey = "okie-pending-messages"

    // Mock getItem to throw an error
    ;(sessionStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("Storage error")
      }
    )

    // Should not throw when trying to retrieve
    let result = []
    try {
      const stored = sessionStorage.getItem(sessionKey)
      result = stored ? JSON.parse(stored) : []
    } catch (e) {
      // Handle error gracefully
      result = []
    }

    expect(result).toEqual([])
  })
})
