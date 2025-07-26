import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import {
  recordTokenUsage,
  getDailyLeaderboard,
  getUserTokenAnalytics,
  getUserDailyUsage,
  getChatTokenUsage,
  getUserUsageStats,
  getTimingAnalytics,
} from "@/lib/token-tracking/api"
import type { TokenUsageMetrics } from "@/lib/token-tracking/types"
import { TokenTrackingError } from "@/lib/token-tracking/types"
import type { Database } from "@/app/types/database.types"

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

const mockCreateClient = createClient as MockedFunction<typeof createClient>

// Type for mock query builder
type MockQueryBuilder = {
  insert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

// Type for mock Supabase client
type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
}

describe("Token Tracking API", () => {
  const mockSupabase: MockSupabaseClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  }

  const mockQuery: MockQueryBuilder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue(
      mockSupabase as unknown as SupabaseClient<Database>
    )
    mockSupabase.from.mockReturnValue(mockQuery)
    mockQuery.insert.mockReturnValue(mockQuery)
    mockQuery.select.mockReturnValue(mockQuery)
    mockQuery.single.mockReturnValue(mockQuery)
    mockQuery.eq.mockReturnValue(mockQuery)
    mockQuery.gte.mockReturnValue(mockQuery)
    mockQuery.lte.mockReturnValue(mockQuery)
    mockQuery.order.mockReturnValue(mockQuery)
  })

  describe("recordTokenUsage", () => {
    const sampleMetrics: TokenUsageMetrics = {
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 10,
      totalTokens: 160,
      durationMs: 2000,
      timeToFirstTokenMs: 500,
      timeToFirstChunkMs: 450,
      streamingDurationMs: 1500,
    }

    it("should record token usage successfully", async () => {
      const mockTokenUsage = {
        id: "test-id",
        user_id: "user-123",
        chat_id: "chat-456",
        message_id: "msg-789",
        provider_id: "openai",
        model_id: "gpt-4",
        input_tokens: 100,
        output_tokens: 50,
        cached_tokens: 10,
        estimated_cost_usd: 0.0075,
        cost_per_input_token_usd: 0.000025,
        cost_per_output_token_usd: 0.00001,
        created_at: "2023-01-01T00:00:00Z",
      }

      mockQuery.single.mockResolvedValue({ data: mockTokenUsage, error: null })

      const result = await recordTokenUsage(
        "user-123",
        "chat-456",
        "msg-789",
        "openai",
        "gpt-4",
        sampleMetrics
      )

      expect(mockSupabase.from).toHaveBeenCalledWith("token_usage")
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: "user-123",
          chat_id: "chat-456",
          message_id: "msg-789",
          provider_id: "openai",
          model_id: "gpt-4",
          input_tokens: 100,
          output_tokens: 50,
          cached_tokens: 10,
          duration_ms: 2000,
          time_to_first_token_ms: 500,
          time_to_first_chunk_ms: 450,
          streaming_duration_ms: 1500,
        }),
      ])
      expect(result).toEqual(mockTokenUsage)
    })

    it("should handle database connection failure", async () => {
      mockCreateClient.mockResolvedValue(null)

      await expect(
        recordTokenUsage(
          "user-123",
          "chat-456",
          "msg-789",
          "openai",
          "gpt-4",
          sampleMetrics
        )
      ).rejects.toThrow(TokenTrackingError)
    })

    it("should handle database insert error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      })

      await expect(
        recordTokenUsage(
          "user-123",
          "chat-456",
          "msg-789",
          "openai",
          "gpt-4",
          sampleMetrics
        )
      ).rejects.toThrow(TokenTrackingError)
    })

    it("should handle unexpected errors", async () => {
      mockQuery.single.mockRejectedValue(new Error("Network error"))

      await expect(
        recordTokenUsage(
          "user-123",
          "chat-456",
          "msg-789",
          "openai",
          "gpt-4",
          sampleMetrics
        )
      ).rejects.toThrow(TokenTrackingError)
    })

    it("should calculate costs correctly for known models", async () => {
      mockQuery.single.mockResolvedValue({ data: {}, error: null })

      await recordTokenUsage(
        "user-123",
        "chat-456",
        "msg-789",
        "openai",
        "gpt-4o",
        sampleMetrics
      )

      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          estimated_cost_usd: expect.any(Number),
          cost_per_input_token_usd: expect.any(Number),
          cost_per_output_token_usd: expect.any(Number),
        }),
      ])
    })
  })

  describe("getDailyLeaderboard", () => {
    it("should get daily leaderboard successfully", async () => {
      const mockLeaderboard = [
        {
          user_id: "user-1",
          total_tokens: 1000,
          total_input_tokens: 600,
          total_output_tokens: 400,
          total_cached_tokens: 50,
          total_messages: 10,
          total_cost_usd: 0.05,
          avg_duration_ms: 2000,
          top_provider: "openai",
          top_model: "gpt-4",
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockLeaderboard, error: null })

      const result = await getDailyLeaderboard("2023-01-01", 10)

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "get_daily_token_leaderboard",
        {
          target_date: "2023-01-01",
          limit_count: 10,
        }
      )
      expect(result).toEqual(mockLeaderboard)
    })

    it("should handle RPC error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      })

      await expect(getDailyLeaderboard()).rejects.toThrow(TokenTrackingError)
    })

    it("should use default parameters", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null })

      await getDailyLeaderboard()

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "get_daily_token_leaderboard",
        {
          target_date: expect.any(String),
          limit_count: 10,
        }
      )
    })
  })

  describe("getUserTokenAnalytics", () => {
    it("should get user analytics successfully", async () => {
      const mockAnalytics = [
        {
          usage_date: "2023-01-01",
          total_tokens: 500,
          total_messages: 5,
          total_cost_usd: 0.025,
          providers: [{ provider: "openai", tokens: 500 }],
          models: [{ model: "gpt-4", tokens: 500 }],
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockAnalytics, error: null })

      const result = await getUserTokenAnalytics("user-123", 30)

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "get_user_token_analytics",
        {
          target_user_id: "user-123",
          days_back: 30,
        }
      )
      expect(result).toEqual(mockAnalytics)
    })

    it("should handle RPC error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "Analytics failed" },
      })

      await expect(getUserTokenAnalytics("user-123")).rejects.toThrow(
        TokenTrackingError
      )
    })
  })

  describe("getUserDailyUsage", () => {
    it("should get user daily usage successfully", async () => {
      const mockUsage = [
        {
          id: "usage-1",
          user_id: "user-123",
          usage_date: "2023-01-01",
          provider_id: "openai",
          model_id: "gpt-4",
          total_input_tokens: 100,
          total_output_tokens: 50,
          total_tokens: 150,
          message_count: 2,
          estimated_cost_usd: 0.0075,
        },
      ]

      mockQuery.order.mockResolvedValue({ data: mockUsage, error: null })

      const result = await getUserDailyUsage("user-123", "2023-01-01")

      expect(mockSupabase.from).toHaveBeenCalledWith("daily_token_usage")
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123")
      expect(mockQuery.eq).toHaveBeenCalledWith("usage_date", "2023-01-01")
      expect(mockQuery.order).toHaveBeenCalledWith("total_tokens", {
        ascending: false,
      })
      expect(result).toEqual(mockUsage)
    })

    it("should handle query error", async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      })

      await expect(getUserDailyUsage("user-123")).rejects.toThrow(
        TokenTrackingError
      )
    })
  })

  describe("getChatTokenUsage", () => {
    it("should get chat token usage successfully", async () => {
      const mockUsage = [
        {
          id: "usage-1",
          chat_id: "chat-456",
          user_id: "user-123",
          input_tokens: 100,
          output_tokens: 50,
          created_at: "2023-01-01T00:00:00Z",
        },
      ]

      mockQuery.order.mockResolvedValue({ data: mockUsage, error: null })

      const result = await getChatTokenUsage("chat-456", "user-123")

      expect(mockSupabase.from).toHaveBeenCalledWith("token_usage")
      expect(mockQuery.eq).toHaveBeenCalledWith("chat_id", "chat-456")
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123")
      expect(mockQuery.order).toHaveBeenCalledWith("created_at", {
        ascending: true,
      })
      expect(result).toEqual(mockUsage)
    })
  })

  describe("getUserUsageStats", () => {
    it("should calculate usage stats correctly", async () => {
      const mockUsage = [
        {
          input_tokens: 100,
          output_tokens: 50,
          estimated_cost_usd: 0.005,
          duration_ms: 2000,
          provider_id: "openai",
          model_id: "gpt-4",
        },
        {
          input_tokens: 200,
          output_tokens: 100,
          estimated_cost_usd: 0.01,
          duration_ms: 3000,
          provider_id: "openai",
          model_id: "gpt-4",
        },
      ]

      mockQuery.lte.mockResolvedValue({ data: mockUsage, error: null })

      const result = await getUserUsageStats("user-123")

      expect(result).toEqual({
        totalTokens: 450, // (100+50) + (200+100)
        totalMessages: 2,
        totalCost: 0.015, // 0.005 + 0.01
        averageDuration: 2500, // (2000 + 3000) / 2
        topProvider: "openai",
        topModel: "gpt-4",
      })
    })

    it("should handle date range filtering", async () => {
      mockQuery.lte.mockResolvedValue({ data: [], error: null })

      await getUserUsageStats("user-123", "2023-01-01", "2023-01-31")

      expect(mockQuery.gte).toHaveBeenCalledWith("created_at", "2023-01-01")
      expect(mockQuery.lte).toHaveBeenCalledWith("created_at", "2023-01-31")
    })

    it("should handle empty usage data", async () => {
      mockQuery.lte.mockResolvedValue({ data: [], error: null })

      const result = await getUserUsageStats("user-123")

      expect(result).toEqual({
        totalTokens: 0,
        totalMessages: 0,
        totalCost: 0,
        averageDuration: 0,
        topProvider: "none",
        topModel: "none",
      })
    })
  })

  describe("getTimingAnalytics", () => {
    it("should get timing analytics successfully", async () => {
      const mockAnalytics = [
        {
          usage_date: "2023-01-01",
          avg_duration_ms: 2000,
          avg_time_to_first_token_ms: 500,
          avg_time_to_first_chunk_ms: 450,
          avg_streaming_duration_ms: 1500,
          message_count: 10,
          provider_timings: [
            {
              provider: "openai",
              model: "gpt-4",
              avg_duration: 2000,
              avg_ttft: 500,
            },
          ],
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockAnalytics, error: null })

      const result = await getTimingAnalytics("user-123", 7)

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_timing_analytics", {
        target_user_id: "user-123",
        days_back: 7,
      })
      expect(result).toEqual(mockAnalytics)
    })

    it("should handle RPC error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "Timing analytics failed" },
      })

      await expect(getTimingAnalytics("user-123")).rejects.toThrow(
        TokenTrackingError
      )
    })
  })

  describe("Error handling", () => {
    it("should handle database connection failure across all functions", async () => {
      mockCreateClient.mockResolvedValue(null)

      const functions = [
        () => getDailyLeaderboard(),
        () => getUserTokenAnalytics("user-123"),
        () => getUserDailyUsage("user-123"),
        () => getChatTokenUsage("chat-456", "user-123"),
        () => getUserUsageStats("user-123"),
        () => getTimingAnalytics("user-123"),
      ]

      for (const fn of functions) {
        await expect(fn()).rejects.toThrow(TokenTrackingError)
      }
    })

    it("should preserve original error context in TokenTrackingError", async () => {
      const originalError = new Error("Network timeout")
      mockQuery.single.mockRejectedValue(originalError)

      try {
        await recordTokenUsage(
          "user-123",
          "chat-456",
          "msg-789",
          "openai",
          "gpt-4",
          {
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
          }
        )
      } catch (error) {
        expect(error).toBeInstanceOf(TokenTrackingError)
        expect((error as TokenTrackingError).context?.originalError).toBe(
          originalError
        )
      }
    })
  })
})
