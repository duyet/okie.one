import type { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  apiLogger: {
    chatRequest: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    tokenUsage: vi.fn(),
  },
}))

vi.mock("@/lib/config", () => ({
  SYSTEM_PROMPT_DEFAULT: "You are a helpful AI assistant.",
  MAX_FILES_PER_MESSAGE: 10,
  MESSAGE_MAX_LENGTH: 100000,
}))

vi.mock("@/lib/models", () => ({
  getAllModels: vi.fn(() =>
    Promise.resolve([
      {
        id: "gpt-4.1-nano",
        name: "GPT-4.1 Nano",
        provider: "OpenAI",
        apiSdk: vi.fn(() => ({ model: "gpt-4.1-nano" })),
      },
    ])
  ),
}))

vi.mock("./api", () => ({
  validateAndTrackUsage: vi.fn(() => Promise.resolve(null)),
  incrementMessageCount: vi.fn(),
  logUserMessage: vi.fn(),
  storeAssistantMessage: vi.fn(() => Promise.resolve("msg-123")),
}))

vi.mock("./utils", () => ({
  createErrorResponse: vi.fn(
    (error) =>
      new Response(
        JSON.stringify({ error: error.message || "Unknown error" }),
        {
          status: error.statusCode || 500,
        }
      )
  ),
}))

// Mock AI SDK functions
vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    toDataStreamResponse: vi.fn(() => new Response("test", { status: 200 })),
  })),
  convertToCoreMessages: vi.fn((messages) => messages),
  generateId: vi.fn(() => "test-id"),
}))

// Import the API handler
import { POST } from "@/app/api/chat/route"

describe("Chat API Request Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Bug Fix: Missing Information Error", () => {
    it("should reject legacy request format with helpful error message", async () => {
      // This is the exact request format from the curl command that was failing
      const legacyRequest = {
        id: "JFxABZEGIqoTiadx", // Legacy field name
        messages: [
          {
            id: "hSr4ldr6bywISC8A",
            role: "user",
            parts: [
              { type: "text", text: "Summarize World War II in 5 sentences" },
            ],
          },
          {
            role: "user",
            content: "Summarize World War II in 5 sentences\n\n\n\n\n",
            parts: [
              {
                type: "text",
                text: "Summarize World War II in 5 sentences\n\n\n\n\n",
              },
            ],
            id: "qHhWB7XgalIjFW80",
          },
        ],
        trigger: "submit-message", // Legacy field
      }

      const request = {
        json: async () => legacyRequest,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)
      const responseBody = await response.json()

      // Should return 400 status
      expect(response.status).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain("chatId or id")
      expect(responseBody.missingFields).toContain("userId")
      expect(responseBody.missingFields).toContain("model")

      // Should include expected format guide
      expect(responseBody.expectedFormat).toBeDefined()
      expect(responseBody.expectedFormat.chatId).toBe("string (required)")
      expect(responseBody.expectedFormat.userId).toBe("string (required)")
      expect(responseBody.expectedFormat.model).toBe("string (required)")
    })

    it("should accept correct current API format", async () => {
      const correctRequest = {
        messages: [
          {
            id: "msg-123",
            role: "user",
            content: "Summarize World War II in 5 sentences",
            parts: [
              { type: "text", text: "Summarize World War II in 5 sentences" },
            ],
          },
        ],
        chatId: "chat-123",
        userId: "user-123",
        model: "gpt-4.1-nano",
        isAuthenticated: true,
        systemPrompt: "You are a helpful AI assistant.",
        tools: [],
        thinkingMode: "none" as const,
      }

      const request = {
        json: async () => correctRequest,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)

      // Should NOT return 400 status (should proceed to streaming)
      expect(response.status).not.toBe(400)
    })

    it("should validate required fields individually", async () => {
      const testCases = [
        {
          name: "missing messages",
          request: {
            chatId: "123",
            userId: "123",
            model: "gpt-4.1-nano",
            isAuthenticated: true,
            systemPrompt: "test",
          },
          expectedMissingFields: ["messages (must be non-empty array)"],
        },
        {
          name: "empty messages array",
          request: {
            messages: [],
            chatId: "123",
            userId: "123",
            model: "gpt-4.1-nano",
            isAuthenticated: true,
            systemPrompt: "test",
          },
          expectedMissingFields: ["messages (must be non-empty array)"],
        },
        {
          name: "missing chatId",
          request: {
            messages: [{ role: "user", content: "test" }],
            userId: "123",
            model: "gpt-4.1-nano",
            isAuthenticated: true,
            systemPrompt: "test",
          },
          expectedMissingFields: ["chatId or id"],
        },
        {
          name: "missing userId",
          request: {
            messages: [{ role: "user", content: "test" }],
            chatId: "123",
            model: "gpt-4.1-nano",
            isAuthenticated: true,
            systemPrompt: "test",
          },
          expectedMissingFields: ["userId"],
        },
        {
          name: "missing model",
          request: {
            messages: [{ role: "user", content: "test" }],
            chatId: "123",
            userId: "123",
            isAuthenticated: true,
            systemPrompt: "test",
          },
          expectedMissingFields: ["model"],
        },
      ]

      for (const testCase of testCases) {
        const request = {
          json: async () => testCase.request,
          method: "POST",
          headers: new Headers({ "content-type": "application/json" }),
        } as unknown as NextRequest

        const response = await POST(request)
        const responseBody = await response.json()

        expect(response.status, `${testCase.name} should return 400`).toBe(400)
        expect(
          responseBody.missingFields,
          `${testCase.name} missing fields`
        ).toEqual(expect.arrayContaining(testCase.expectedMissingFields))
      }
    })

    it("should handle multiple missing fields", async () => {
      const incompleteRequest = {
        messages: [{ role: "user", content: "test" }],
        // Missing: chatId, userId, model, isAuthenticated, systemPrompt
      }

      const request = {
        json: async () => incompleteRequest,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody.missingFields).toEqual(
        expect.arrayContaining(["chatId or id", "userId", "model"])
      )
      expect(responseBody.missingFields.length).toBeGreaterThanOrEqual(3)
    })

    it("should handle invalid JSON gracefully", async () => {
      const request = {
        json: async () => {
          throw new SyntaxError("Invalid JSON")
        },
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody.error).toBe("Invalid request body")
    })
  })

  describe("State-of-the-art API Features", () => {
    it("should support latest thinking modes", async () => {
      const requestWithThinking = {
        messages: [
          {
            role: "user",
            content: "Explain quantum computing",
            parts: [{ type: "text", text: "Explain quantum computing" }],
          },
        ],
        chatId: "chat-123",
        userId: "user-123",
        model: "gpt-4.1-nano",
        isAuthenticated: true,
        systemPrompt: "You are a helpful AI assistant.",
        thinkingMode: "sequential" as const,
        tools: [{ type: "mcp" as const, name: "server-sequential-thinking" }],
      }

      const request = {
        json: async () => requestWithThinking,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)

      // Should not fail validation
      expect(response.status).not.toBe(400)
    })

    it("should support modern tools configuration", async () => {
      const requestWithTools = {
        messages: [
          {
            role: "user",
            content: "Search for latest AI news",
            parts: [{ type: "text", text: "Search for latest AI news" }],
          },
        ],
        chatId: "chat-123",
        userId: "user-123",
        model: "gpt-4.1-nano",
        isAuthenticated: true,
        systemPrompt: "You are a helpful AI assistant.",
        tools: [
          { type: "web_search" as const },
          { type: "mcp" as const, name: "server-sequential-thinking" },
        ],
      }

      const request = {
        json: async () => requestWithTools,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)

      // Should not fail validation
      expect(response.status).not.toBe(400)
    })

    it("should support AI SDK v5 message format with parts", async () => {
      const v5Request = {
        messages: [
          {
            id: "msg-123",
            role: "user",
            parts: [
              { type: "text", text: "Analyze this image and code" },
              {
                type: "file",
                name: "example.png",
                mediaType: "image/png",
                data: "base64imagedata...",
              },
            ],
          },
        ],
        chatId: "chat-123",
        userId: "user-123",
        model: "gpt-4.1-nano",
        isAuthenticated: true,
        systemPrompt: "You are a helpful AI assistant.",
      }

      const request = {
        json: async () => v5Request,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as NextRequest

      const response = await POST(request)

      // Should not fail validation
      expect(response.status).not.toBe(400)
    })
  })
})
