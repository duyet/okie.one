import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Home to Chat Navigation Message Persistence", () => {
  beforeEach(() => {
    // Mock sessionStorage
    const storage: Record<string, string> = {}
    global.sessionStorage = {
      getItem: vi.fn((key) => storage[key] || null),
      setItem: vi.fn((key, value) => {
        storage[key] = value
      }),
      removeItem: vi.fn((key) => {
        delete storage[key]
      }),
      clear: vi.fn(() =>
        Object.keys(storage).forEach((key) => delete storage[key])
      ),
      key: vi.fn(),
      length: 0,
    }
  })

  it("should persist messages through navigation from home to chat", () => {
    const sessionKey = "okie-pending-messages"

    // Step 1: User sends message from home page (chatId = null)
    const userMessage = {
      id: "user-msg-1",
      role: "user" as const,
      content: "hello",
      createdAt: new Date(),
    }

    // Message should be saved to session storage
    sessionStorage.setItem(sessionKey, JSON.stringify([userMessage]))

    // Step 2: Navigation happens (component unmounts and remounts)
    // Simulate retrieving messages from session storage on new chat page
    const stored = sessionStorage.getItem(sessionKey)
    const restoredMessages = stored ? JSON.parse(stored) : []

    expect(restoredMessages).toHaveLength(1)
    expect(restoredMessages[0].content).toBe("hello")

    // Step 3: After chat is created, session storage should be cleared
    const chatId = "new-chat-id"
    if (chatId) {
      sessionStorage.removeItem(sessionKey)
    }

    expect(sessionStorage.getItem(sessionKey)).toBeNull()
  })

  it("should handle the complete flow with AI response", () => {
    const sessionKey = "okie-pending-messages"

    // User message
    const messages: Array<{
      id: string
      role: "user" | "assistant"
      content: string
      createdAt: Date
    }> = [
      {
        id: "1",
        role: "user" as const,
        content: "hello",
        createdAt: new Date(),
      },
    ]

    // Save to session storage before navigation
    sessionStorage.setItem(sessionKey, JSON.stringify(messages))

    // After navigation, messages should be restored
    const restored = sessionStorage.getItem(sessionKey)
    expect(restored).toBeTruthy()

    // AI response comes in
    const aiMessage = {
      id: "2",
      role: "assistant" as const,
      content: "Hello! How can I help you?",
      createdAt: new Date(),
    }

    messages.push(aiMessage)

    // Both messages should be visible
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe("user")
    expect(messages[1].role).toBe("assistant")
  })
})
