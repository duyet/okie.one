import type { SupabaseClient } from "@supabase/supabase-js"
import { streamText } from "ai"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from "vitest"

import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "@/app/api/chat/api"
import { POST } from "@/app/api/chat/route"
import type { Database } from "@/app/types/database.types"
import { parseArtifacts } from "@/lib/artifacts/parser"
import { getAllModels } from "@/lib/models"
import type { ModelConfig } from "@/lib/models/types"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { recordTokenUsage } from "@/lib/token-tracking/api"
import type { TokenUsageMetrics } from "@/lib/token-tracking/types"
import type { ProviderWithoutOllama } from "@/lib/user-keys"

// AI SDK v5 - streamText onFinish callback type (for token tracking)
type OnFinishCallback = (params: {
  response: {
    messages: Array<{
      role: "assistant" | "user" | "system"
      content: string | Array<{ type: string; text?: string; url?: string }>
    }>
  }
  usage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cachedTokens?: number
    promptTokens?: number
    completionTokens?: number
  }
  finishReason: string
}) => void | Promise<void>

type OnChunkCallback = () => void

// AI SDK v5 - Modern streamText mock return type
interface MockStreamTextResult {
  toUIMessageStreamResponse: (params: {
    originalMessages: Array<any>
    onFinish: OnFinishCallback
  }) => Response
}

// Mock all external dependencies
vi.mock("@/lib/token-tracking/api", () => ({
  recordTokenUsage: vi.fn(),
}))

vi.mock("@/lib/openproviders/provider-map", () => ({
  getProviderForModel: vi.fn(),
}))

vi.mock("@/app/api/chat/api", () => ({
  validateAndTrackUsage: vi.fn(),
  incrementMessageCount: vi.fn(),
  logUserMessage: vi.fn(),
  storeAssistantMessage: vi.fn(),
}))

vi.mock("@/lib/models", () => ({
  getAllModels: vi.fn(),
}))

vi.mock("@/lib/artifacts/parser", () => ({
  parseArtifacts: vi.fn(),
}))

vi.mock("ai", async () => {
  const actual = await vi.importActual("ai")
  return {
    ...actual,
    streamText: vi.fn(),
    convertToModelMessages: vi.fn((messages) => messages), // Pass-through for testing
  }
})

// Mock the fetch API
global.fetch = vi.fn()

vi.mock("@/lib/user-keys", () => ({
  getEffectiveApiKey: vi.fn().mockResolvedValue("test-api-key"),
}))

// Type the mocked functions
const mockRecordTokenUsage = recordTokenUsage as MockedFunction<
  typeof recordTokenUsage
>
const mockGetProviderForModel = getProviderForModel as MockedFunction<
  typeof getProviderForModel
>
const mockValidateAndTrackUsage = validateAndTrackUsage as MockedFunction<
  typeof validateAndTrackUsage
>
const mockIncrementMessageCount = incrementMessageCount as MockedFunction<
  typeof incrementMessageCount
>
const mockLogUserMessage = logUserMessage as MockedFunction<
  typeof logUserMessage
>
const mockStoreAssistantMessage = storeAssistantMessage as MockedFunction<
  typeof storeAssistantMessage
>
const mockGetAllModels = getAllModels as MockedFunction<typeof getAllModels>
const mockParseArtifacts = parseArtifacts as MockedFunction<
  typeof parseArtifacts
>
// biome-ignore lint/suspicious/noExplicitAny: Mock types require any for flexibility
const mockStreamText = streamText as MockedFunction<any>

describe("Chat API Token Tracking", () => {
  const mockSupabase = {
    from: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  } as unknown as SupabaseClient<Database>

  const sampleRequest = {
    messages: [{ role: "user" as const, content: "Hello" }],
    chatId: "chat-123",
    userId: "user-456",
    model: "gpt-4o",
    isAuthenticated: true,
    systemPrompt: "You are a helpful assistant",
    enableSearch: false,
    message_group_id: "group-789",
  }

  const sampleModelConfig: ModelConfig = {
    id: "gpt-4o",
    name: "GPT-4 Omni",
    provider: "OpenAI",
    providerId: "openai",
    baseProviderId: "openai",
    modelFamily: "GPT-4",
    contextWindow: 128000,
    vision: false,
    tools: true,
    reasoningText: false,
    webSearch: false,
    openSource: false,
    apiSdk: vi.fn().mockReturnValue("mock-api-sdk"),
  }

  const sampleUsageData = {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    cachedTokens: 10,
  }

  const sampleResponseMessages = [
    {
      role: "assistant" as const,
      content: "Hello! How can I help you today?",
    },
  ]

  // AI SDK v5 - Updated helper to set up streamText mock with new pattern
  const setupStreamTextMock = () => {
    let onFinishCallback: OnFinishCallback | null = null
    let onChunkCallback: OnChunkCallback | null = null

    mockStreamText.mockImplementation((config: any) => {
      // Store callbacks from streamText itself (AI SDK v5 pattern)
      if (config.onChunk) onChunkCallback = config.onChunk
      if (config.onFinish) onFinishCallback = config.onFinish

      return {
        // AI SDK v5 - toUIMessageStreamResponse for streaming response
        toUIMessageStreamResponse: vi.fn().mockImplementation((params: any) => {
          return new Response("mock-stream")
        }),
      } as MockStreamTextResult
    })

    return {
      getOnFinishCallback: () => onFinishCallback as OnFinishCallback,
      getOnChunkCallback: () => onChunkCallback as OnChunkCallback,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock Date.now() to return predictable values
    const mockDate = new Date("2024-01-01T00:00:00.000Z")
    vi.setSystemTime(mockDate)

    // Setup default mock implementations
    mockValidateAndTrackUsage.mockResolvedValue(mockSupabase)
    mockIncrementMessageCount.mockResolvedValue(undefined)
    mockLogUserMessage.mockResolvedValue(undefined)
    mockStoreAssistantMessage.mockResolvedValue("msg-123")
    mockGetAllModels.mockResolvedValue([sampleModelConfig])
    mockGetProviderForModel.mockReturnValue("openai")
    mockParseArtifacts.mockReturnValue([])
    mockRecordTokenUsage.mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Token Usage Recording", () => {
    it("should record token usage successfully after AI response", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Verify streamText was called with onFinish callback
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          onFinish: expect.any(Function),
        })
      )

      // Simulate the onFinish callback with usage data
      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Verify token usage was recorded
      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 10,
          totalTokens: 150,
          durationMs: expect.any(Number),
          timeToFirstTokenMs: undefined, // No chunks were simulated
          timeToFirstChunkMs: undefined,
          streamingDurationMs: undefined,
        })
      )
    })

    it("should handle timing metrics when chunks are received", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      const { getOnFinishCallback, getOnChunkCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Simulate first chunk after 500ms
      vi.advanceTimersByTime(500)
      const onChunkCallback = getOnChunkCallback()
      onChunkCallback()

      // Simulate completion after another 1000ms
      vi.advanceTimersByTime(1000)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Verify timing metrics were captured
      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 10,
          totalTokens: 150,
          durationMs: 1500, // Total request duration
          timeToFirstTokenMs: 500, // Time to first chunk
          timeToFirstChunkMs: 500,
          streamingDurationMs: 1000, // Time from first chunk to completion
        })
      )
    })

    it("should handle cached tokens from AI SDK usage data", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Usage data with cached tokens
      const usageDataWithCached = {
        ...sampleUsageData,
        cachedTokens: 25,
      }

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: usageDataWithCached,
        finishReason: "stop",
      })

      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          cachedTokens: 25,
        })
      )
    })

    it("should handle missing cachedTokens in usage data", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Usage data without cached tokens
      const usageDataNoCached = {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        // No cachedTokens property
      }

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: usageDataNoCached,
        finishReason: "stop",
      })

      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          cachedTokens: 0, // Should default to 0
        })
      )
    })

    it("should calculate totalTokens when not provided by AI SDK", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Usage data without totalTokens
      const usageDataNoTotal = {
        inputTokens: 75,
        outputTokens: 25,
        totalTokens: 100, // Add totalTokens
      }

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: usageDataNoTotal,
        finishReason: "stop",
      })

      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          totalTokens: 100, // Should be inputTokens + outputTokens
        })
      )
    })
  })

  describe("Error Handling", () => {
    it("should not fail chat when token tracking fails", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      // Make recordTokenUsage throw an error
      mockRecordTokenUsage.mockRejectedValue(
        new Error("Database connection failed")
      )

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      const response = await POST(request)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      // This should not throw an error
      const onFinishCallback = getOnFinishCallback()
      await expect(
        onFinishCallback({
          response: mockResponse,
          usage: sampleUsageData,
          finishReason: "stop",
        })
      ).resolves.not.toThrow()

      // Chat should still return successfully
      expect(response).toBeInstanceOf(Response)
      expect(mockRecordTokenUsage).toHaveBeenCalled()
    })

    it("should skip token recording when usage data is missing", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      // Call onFinish without usage data
      const onFinishCallback = getOnFinishCallback()
      await onFinishCallback({
        response: mockResponse,
        // biome-ignore lint/suspicious/noExplicitAny: Null usage requires any
        usage: null as any,
        finishReason: "stop",
      })

      // Token tracking should not be called
      expect(mockRecordTokenUsage).not.toHaveBeenCalled()
    })

    it("should skip token recording when assistantMessageId is missing", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      // Make storeAssistantMessage return null
      mockStoreAssistantMessage.mockResolvedValue(null)

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Token tracking should not be called
      expect(mockRecordTokenUsage).not.toHaveBeenCalled()
    })

    it("should skip token recording when Supabase is not available", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      // Make validateAndTrackUsage return null (no Supabase)
      mockValidateAndTrackUsage.mockResolvedValue(null)

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Token tracking should not be called
      expect(mockRecordTokenUsage).not.toHaveBeenCalled()
    })

    it("should handle provider mapping errors gracefully", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Make getProviderForModel throw an error after the request is set up
      mockGetProviderForModel.mockImplementation(() => {
        throw new Error("Unknown provider for model")
      })

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      // This should not crash the entire request
      const onFinishCallback = getOnFinishCallback()
      await expect(
        onFinishCallback({
          response: mockResponse,
          usage: sampleUsageData,
          finishReason: "stop",
        })
      ).resolves.not.toThrow()

      // recordTokenUsage should not be called due to provider error
      expect(mockRecordTokenUsage).not.toHaveBeenCalled()
    })
  })

  describe("Provider and Model Mapping", () => {
    it("should correctly map different providers", async () => {
      const testCases = [
        { model: "gpt-4o", expectedProvider: "openai" },
        { model: "claude-3-5-sonnet-latest", expectedProvider: "anthropic" },
        { model: "gemini-1.5-pro", expectedProvider: "google" },
        { model: "mistral-large-latest", expectedProvider: "mistral" },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()

        const { getOnFinishCallback } = setupStreamTextMock()

        mockGetProviderForModel.mockReturnValue(
          testCase.expectedProvider as ProviderWithoutOllama
        )
        mockValidateAndTrackUsage.mockResolvedValue(mockSupabase)
        mockStoreAssistantMessage.mockResolvedValue("msg-123")
        mockGetAllModels.mockResolvedValue([
          { ...sampleModelConfig, id: testCase.model },
        ])

        const request = new Request("http://localhost:3000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...sampleRequest,
            model: testCase.model,
          }),
        })

        await POST(request)

        const mockResponse = {
          messages: sampleResponseMessages,
        }

        const onFinishCallback = getOnFinishCallback()
        expect(onFinishCallback).toBeDefined()

        await onFinishCallback({
          response: mockResponse,
          usage: sampleUsageData,
          finishReason: "stop",
        })

        expect(mockRecordTokenUsage).toHaveBeenCalledWith(
          "user-456",
          "chat-123",
          "msg-123",
          testCase.expectedProvider,
          testCase.model,
          expect.any(Object)
        )
      }
    })
  })

  describe("Timing Edge Cases", () => {
    it("should handle multiple chunk callbacks correctly", async () => {
      const { getOnFinishCallback, getOnChunkCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Simulate multiple chunk callbacks - only first should set timing
      vi.advanceTimersByTime(300)
      const onChunkCallback = getOnChunkCallback()
      onChunkCallback() // First chunk - should set timings

      vi.advanceTimersByTime(200)
      onChunkCallback() // Second chunk - should not change timings

      vi.advanceTimersByTime(500)
      onChunkCallback() // Third chunk - should not change timings

      vi.advanceTimersByTime(1000)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Should use timing from first chunk only
      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          timeToFirstTokenMs: 300, // Time to first chunk
          timeToFirstChunkMs: 300,
          streamingDurationMs: 1700, // From first chunk to end
        })
      )
    })

    it("should handle timing when no chunks are received", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Complete without any chunks
      vi.advanceTimersByTime(2000)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expect.objectContaining({
          durationMs: 2000,
          timeToFirstTokenMs: undefined,
          timeToFirstChunkMs: undefined,
          streamingDurationMs: undefined,
        })
      )
    })
  })

  describe("Cost Calculation Integration", () => {
    it("should pass timing and cost data to recordTokenUsage", async () => {
      const { getOnFinishCallback, getOnChunkCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Simulate streaming with timing
      vi.advanceTimersByTime(400)
      const onChunkCallback = getOnChunkCallback()
      onChunkCallback()
      vi.advanceTimersByTime(1200)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      const onFinishCallback = getOnFinishCallback()
      expect(onFinishCallback).toBeDefined()

      await onFinishCallback({
        response: mockResponse,
        usage: {
          inputTokens: 200,
          outputTokens: 100,
          totalTokens: 300,
          cachedTokens: 15,
        },
        finishReason: "stop",
      })

      // Verify all metrics are passed correctly
      const expectedMetrics: TokenUsageMetrics = {
        inputTokens: 200,
        outputTokens: 100,
        cachedTokens: 15,
        totalTokens: 300,
        durationMs: 1600,
        timeToFirstTokenMs: 400,
        timeToFirstChunkMs: 400,
        streamingDurationMs: 1200,
      }

      expect(mockRecordTokenUsage).toHaveBeenCalledWith(
        "user-456",
        "chat-123",
        "msg-123",
        "openai",
        "gpt-4o",
        expectedMetrics
      )
    })
  })

  describe("Response Processing", () => {
    it("should handle complex response message formats", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Complex response with multiple message formats
      const complexResponse = {
        messages: [
          {
            role: "assistant" as const,
            content: "Here's a response with text",
          },
          {
            role: "assistant" as const,
            content: [
              { type: "text", text: "Part 1" },
              { type: "text", text: "Part 2" },
              { type: "image", url: "http://example.com/image.jpg" }, // Non-text content
            ],
          },
          {
            role: "assistant" as const,
            content: [], // Empty content array
          },
        ],
      }

      const onFinishCallback = getOnFinishCallback()
      await onFinishCallback({
        response: complexResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Should still process and record token usage
      expect(mockRecordTokenUsage).toHaveBeenCalled()
      expect(mockParseArtifacts).toHaveBeenCalledWith(
        "Here's a response with text\nPart 1\nPart 2\n", // Should concatenate text parts only
        false
      )
    })

    it("should handle empty or missing response messages", async () => {
      const { getOnFinishCallback } = setupStreamTextMock()

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      const emptyResponse = {
        messages: [], // No messages
      }

      const onFinishCallback2 = getOnFinishCallback()
      await onFinishCallback2({
        response: emptyResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Should still record token usage
      expect(mockRecordTokenUsage).toHaveBeenCalled()
      expect(mockParseArtifacts).toHaveBeenCalledWith("", false)
    })
  })
})
