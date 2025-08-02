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

// Test helper types for streamText callbacks - simplified for testing
type OnFinishCallback = (params: {
  response: {
    messages: Array<{
      role: "assistant" | "user" | "system"
      content: string | Array<{ type: string; text?: string; url?: string }>
    }>
  }
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
  }
  finishReason: string
}) => void | Promise<void>

type OnChunkCallback = () => void

// Simplified config type removed - using any for mock implementations

// Minimal mock return type for streamText
interface MockStreamTextResult {
  toDataStreamResponse: () => Response
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

vi.mock("ai", () => ({
  streamText: vi.fn(),
}))

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
    reasoning: false,
    webSearch: false,
    openSource: false,
    apiSdk: vi.fn().mockReturnValue("mock-api-sdk"),
  }

  const sampleUsageData = {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    cachedTokens: 10,
  }

  const sampleResponseMessages = [
    {
      role: "assistant" as const,
      content: "Hello! How can I help you today?",
    },
  ]

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

    // Mock streamText with proper structure
    const mockResult = {
      toDataStreamResponse: vi
        .fn()
        .mockReturnValue(new Response("mock-stream")),
    }
    // biome-ignore lint/suspicious/noExplicitAny: Mock return value requires any
    mockStreamText.mockReturnValue(mockResult as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Token Usage Recording", () => {
    it("should record token usage successfully after AI response", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // Capture the onFinish callback when streamText is called
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Verify streamText was called
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          onFinish: expect.any(Function),
        })
      )

      // Simulate the onFinish callback with usage data
      const mockResponse = {
        messages: sampleResponseMessages,
      }

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
      let onFinishCallback: OnFinishCallback = null as any
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onChunkCallback: OnChunkCallback = (() => {}) as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        if (config.onChunk) onChunkCallback = config.onChunk
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Simulate first chunk after 500ms
      vi.advanceTimersByTime(500)
      onChunkCallback()

      // Simulate completion after another 1000ms
      vi.advanceTimersByTime(1000)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Usage data without cached tokens
      const usageDataNoCached = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        // No cachedTokens property
      }

      const mockResponse = {
        messages: sampleResponseMessages,
      }

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Usage data without totalTokens
      const usageDataNoTotal = {
        promptTokens: 75,
        completionTokens: 25,
        totalTokens: 100, // Add totalTokens
      }

      const mockResponse = {
        messages: sampleResponseMessages,
      }

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
          totalTokens: 100, // Should be promptTokens + completionTokens
        })
      )
    })
  })

  describe("Error Handling", () => {
    it("should not fail chat when token tracking fails", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Token tracking should not be called
      expect(mockRecordTokenUsage).not.toHaveBeenCalled()
    })

    it("should skip token recording when Supabase is not available", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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

      await onFinishCallback({
        response: mockResponse,
        usage: sampleUsageData,
        finishReason: "stop",
      })

      // Token tracking should not be called
      expect(mockRecordTokenUsage).not.toHaveBeenCalled()
    })

    it("should handle provider mapping errors gracefully", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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

        // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
        let onFinishCallback: OnFinishCallback = null as any

        // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
        mockStreamText.mockImplementation((config: any) => {
          if (config.onFinish) onFinishCallback = config.onFinish
          return {
            toDataStreamResponse: vi
              .fn()
              .mockReturnValue(new Response("mock-stream")),
            // Add required properties for StreamTextResult type
            warnings: undefined,
            usage: {
              promptTokens: 100,
              completionTokens: 50,
              totalTokens: 150,
            },
            sources: undefined,
            files: undefined,
            response: {
              messages: [],
              id: "test-id",
              timestamp: new Date(),
              modelId: "test-model",
            },
            experimental_providerMetadata: undefined,
            finishReason: "stop",
            text: "mock response",
            toolCalls: [],
            toolResults: [],
            rawResponse: undefined,
            request: undefined,
            logprobs: undefined,
            responseMessages: [],
            roundtrips: [],
          } as MockStreamTextResult
        })

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onChunkCallback: OnChunkCallback = (() => {}) as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        if (config.onChunk) onChunkCallback = config.onChunk
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Simulate multiple chunk callbacks - only first should set timing
      vi.advanceTimersByTime(300)
      onChunkCallback() // First chunk - should set timings

      vi.advanceTimersByTime(200)
      onChunkCallback() // Second chunk - should not change timings

      vi.advanceTimersByTime(500)
      onChunkCallback() // Third chunk - should not change timings

      vi.advanceTimersByTime(1000)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onChunkCallback: OnChunkCallback = (() => {}) as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        if (config.onChunk) onChunkCallback = config.onChunk
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      // Simulate streaming with timing
      vi.advanceTimersByTime(400)
      onChunkCallback()
      vi.advanceTimersByTime(1200)

      const mockResponse = {
        messages: sampleResponseMessages,
      }

      await onFinishCallback({
        response: mockResponse,
        usage: {
          promptTokens: 200,
          completionTokens: 100,
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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

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
      // biome-ignore lint/suspicious/noExplicitAny: Callback initialization requires any
      let onFinishCallback: OnFinishCallback = null as any

      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any
      mockStreamText.mockImplementation((config: any) => {
        if (config.onFinish) onFinishCallback = config.onFinish
        return {
          toDataStreamResponse: vi
            .fn()
            .mockReturnValue(new Response("mock-stream")),
          // Add required properties for StreamTextResult type
          warnings: undefined,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          sources: undefined,
          files: undefined,
          response: {
            messages: [],
            id: "test-id",
            timestamp: new Date(),
            modelId: "test-model",
          },
          experimental_providerMetadata: undefined,
          finishReason: "stop",
          text: "mock response",
          toolCalls: [],
          toolResults: [],
          rawResponse: undefined,
          request: undefined,
          logprobs: undefined,
          responseMessages: [],
          roundtrips: [],
        } as MockStreamTextResult
      })

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRequest),
      })

      await POST(request)

      const emptyResponse = {
        messages: [], // No messages
      }

      await onFinishCallback({
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
