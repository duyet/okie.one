import { useChat } from "@ai-sdk/react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the necessary modules
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
  redirect: vi.fn(),
}))

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}))

// Mock the chat store providers
vi.mock("@/lib/chat-store/messages/provider", () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    isLoading: false,
    cacheAndAddMessage: vi.fn(),
    setHasActiveChatSession: vi.fn(),
  })),
  MessagesProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("@/lib/chat-store/session/provider", () => ({
  useChatSession: vi.fn(() => ({
    chatId: null,
  })),
  ChatSessionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}))

vi.mock("@/lib/user-store/provider", () => ({
  useUser: vi.fn(() => ({
    user: { id: "test-user", anonymous: true },
  })),
}))

vi.mock("@/lib/user-preference-store/provider", () => ({
  useUserPreferences: vi.fn(() => ({
    preferences: { promptSuggestions: true },
  })),
}))

vi.mock("@/lib/chat-store/chats/provider", () => ({
  useChats: vi.fn(() => ({
    createNewChat: vi.fn(),
    getChatById: vi.fn(() => null),
    updateChatModel: vi.fn(),
    bumpChat: vi.fn(),
    isLoading: false,
  })),
}))

vi.mock("@/app/hooks/use-chat-draft", () => ({
  useChatDraft: vi.fn(() => ({
    draftValue: "",
    clearDraft: vi.fn(),
  })),
}))

// Mock motion/react
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock dynamic imports
vi.mock("next/dynamic", () => ({
  default: (fn: any) => {
    const Component = () => null
    Component.displayName = "MockedDynamicComponent"
    return Component
  },
}))

// Import components after mocks
import { Chat } from "@/app/components/chat/chat"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"

// Create a simplified test chat component
function TestChat() {
  const { handleSubmit } = useChat({
    id: "test-chat",
    initialMessages: [],
    onFinish: () => {},
  })

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Type a message..." />
        <button type="submit" aria-label="Send">
          Send
        </button>
      </form>
    </div>
  )
}

describe("Chat Message Persistence", () => {
  let mockUseChat: ReturnType<typeof vi.fn>
  let mockPush: ReturnType<typeof vi.fn>
  let mockCacheAndAddMessage: ReturnType<typeof vi.fn>
  let mockSetHasActiveChatSession: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockPush = vi.fn()
    mockCacheAndAddMessage = vi.fn()
    mockSetHasActiveChatSession = vi.fn()

    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    })

    mockUseChat = vi.fn(() => ({
      messages: [],
      input: "",
      handleSubmit: vi.fn(),
      status: "ready",
      error: null,
      reload: vi.fn(),
      stop: vi.fn(),
      setMessages: vi.fn(),
      setInput: vi.fn(),
      append: vi.fn(),
    }))
    ;(useChat as ReturnType<typeof vi.fn>).mockImplementation(mockUseChat)
  })

  it("should track message state transitions during home to chat navigation", async () => {
    const messageStateLog: Array<{
      phase: string
      messages: unknown[]
      chatId: string | null
    }> = []

    // Track message state changes
    let currentMessages: unknown[] = []
    let currentChatId: string | null = null

    mockUseChat.mockImplementation((config: any) => {
      const { onFinish, initialMessages } = config

      // Log initial state
      messageStateLog.push({
        phase: "useChat-init",
        messages: initialMessages || [],
        chatId: currentChatId,
      })

      const mockHandleSubmit = vi.fn(async () => {
        // Simulate message submission
        currentMessages = [{ id: "1", role: "user", content: "hello" }]
        messageStateLog.push({
          phase: "after-submit",
          messages: currentMessages,
          chatId: currentChatId,
        })

        // Simulate chat creation and navigation
        setTimeout(() => {
          currentChatId = "new-chat-id"
          mockPush("/c/new-chat-id")

          messageStateLog.push({
            phase: "after-navigation",
            messages: currentMessages,
            chatId: currentChatId,
          })
        }, 100)

        // Simulate AI response
        setTimeout(() => {
          const aiMessage = {
            id: "2",
            role: "assistant",
            content: "Hello! How can I help you?",
          }
          currentMessages = [...currentMessages, aiMessage]

          if (onFinish) {
            onFinish(aiMessage as any)
          }

          messageStateLog.push({
            phase: "after-ai-response",
            messages: currentMessages,
            chatId: currentChatId,
          })
        }, 200)
      })

      return {
        messages: currentMessages,
        input: "",
        handleSubmit: mockHandleSubmit,
        status: currentMessages.length > 0 ? "streaming" : "ready",
        error: null,
        reload: vi.fn(),
        stop: vi.fn(),
        setMessages: vi.fn((newMessages) => {
          currentMessages = newMessages
          messageStateLog.push({
            phase: "setMessages-called",
            messages: newMessages,
            chatId: currentChatId,
          })
        }),
        setInput: vi.fn(),
        append: vi.fn(),
      }
    })

    // Test the actual flow
    const { rerender } = render(<TestChat />)

    // Find and click submit (simulating user sending message from home)
    const submitButton = screen.getByRole("button", { name: /send/i })
    await userEvent.click(submitButton)

    // Wait for navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/c/new-chat-id")
    })

    // Simulate component re-render after navigation
    ;(useChatSession as ReturnType<typeof vi.fn>).mockReturnValue({
      chatId: "new-chat-id",
    })

    rerender(<TestChat />)

    // Wait for AI response
    await waitFor(
      () => {
        expect(messageStateLog).toContainEqual(
          expect.objectContaining({ phase: "after-ai-response" })
        )
      },
      { timeout: 3000 }
    )

    // Analyze the message state transitions
    console.log("Message State Log:", messageStateLog)

    // Verify the issue: messages might be cleared during navigation
    const navigationPhase = messageStateLog.find(
      (log) => log.phase === "after-navigation"
    )
    const aiResponsePhase = messageStateLog.find(
      (log) => log.phase === "after-ai-response"
    )

    expect(navigationPhase?.messages.length).toBeGreaterThan(0)
    expect(aiResponsePhase?.messages.length).toBe(2)
  })

  it("should test hasActiveChatSession flag behavior", async () => {
    let hasActiveChatSessionValue = false

    ;(useMessages as ReturnType<typeof vi.fn>).mockReturnValue({
      messages: [],
      isLoading: false,
      cacheAndAddMessage: mockCacheAndAddMessage,
      setHasActiveChatSession: (value: boolean) => {
        hasActiveChatSessionValue = value
        mockSetHasActiveChatSession(value)
      },
    })

    render(<Chat />)

    // Verify setHasActiveChatSession is called during message submission
    const submitButton = screen.getByRole("button", { name: /send/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSetHasActiveChatSession).toHaveBeenCalledWith(true)
    })

    // Verify it's set to false on unmount
    // This would happen in the real component lifecycle
  })

  it("should test race condition between DB write and navigation", async () => {
    const dbWriteLog: Array<{ action: string; timestamp: number }> = []

    mockCacheAndAddMessage.mockImplementation(async (message: any) => {
      dbWriteLog.push({ action: "db-write-start", timestamp: Date.now() })
      // Simulate DB write delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      dbWriteLog.push({ action: "db-write-complete", timestamp: Date.now() })
    })

    mockPush.mockImplementation((path: string) => {
      dbWriteLog.push({ action: "navigation", timestamp: Date.now() })
    })

    render(<Chat />)

    const submitButton = screen.getByRole("button", { name: /send/i })
    await userEvent.click(submitButton)

    await waitFor(
      () => {
        expect(dbWriteLog.length).toBeGreaterThan(0)
      },
      { timeout: 1000 }
    )

    // Check if navigation happens before DB write completes
    const navigationIndex = dbWriteLog.findIndex(
      (log) => log.action === "navigation"
    )
    const dbCompleteIndex = dbWriteLog.findIndex(
      (log) => log.action === "db-write-complete"
    )

    if (navigationIndex > -1 && dbCompleteIndex > -1) {
      console.log("Race condition detected:", navigationIndex < dbCompleteIndex)
    }
  })
})
