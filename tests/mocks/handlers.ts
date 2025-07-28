import { HttpResponse, http } from "msw"

export const handlers = [
  // Mock Supabase auth
  http.post("*/auth/v1/token*", () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: "test@example.com",
      },
    })
  }),

  // Mock chat API
  http.post("/api/chat", () => {
    return new HttpResponse("Mock chat response", {
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }),

  // Mock models API
  http.get("/api/models", () => {
    return HttpResponse.json({
      models: [
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          provider: "OpenAI",
        },
      ],
    })
  }),

  // Mock user preferences API
  http.get("/api/user-preferences", () => {
    return HttpResponse.json({
      layout: "fullscreen",
      prompt_suggestions: true,
      show_tool_invocations: true,
      show_conversation_previews: true,
      multi_model_enabled: false,
      hidden_models: [],
      mcp_settings: {
        "sequential-thinking": true,
      },
    })
  }),

  http.put("/api/user-preferences", async ({ request }) => {
    const body = await request.json()
    // Echo back the body with merged settings for testing
    return HttpResponse.json({
      layout: "fullscreen",
      prompt_suggestions: true,
      show_tool_invocations: true,
      show_conversation_previews: true,
      multi_model_enabled: false,
      hidden_models: [],
      mcp_settings: {
        "sequential-thinking": true,
        ...(typeof body === "object" && body !== null && "mcp_settings" in body
          ? body.mcp_settings
          : {}),
      },
    })
  }),

  // Mock analytics token usage API
  http.get("/api/analytics/token-usage", ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const type = url.searchParams.get("type")
    const leaderboard = url.searchParams.get("leaderboard")

    // Handle legacy test API format
    if (leaderboard === "true") {
      return HttpResponse.json({
        leaderboard: [
          {
            userId: "user-1",
            totalTokens: 5432,
            username: "john_doe",
          },
          {
            userId: "user-2",
            totalTokens: 3210,
            username: "jane_smith",
          },
        ],
      })
    }

    // Handle actual component API format
    if (type === "leaderboard") {
      return HttpResponse.json({
        leaderboard: [
          {
            user_id: "user-1",
            total_tokens: 5432,
            total_input_tokens: 2000,
            total_output_tokens: 3432,
            total_cached_tokens: 0,
            total_messages: 25,
            total_cost_usd: 0.12,
            avg_duration_ms: 1500,
            avg_time_to_first_token_ms: 300,
            top_provider: "OpenAI",
            top_model: "gpt-4",
          },
          {
            user_id: "user-2",
            total_tokens: 3210,
            total_input_tokens: 1500,
            total_output_tokens: 1710,
            total_cached_tokens: 0,
            total_messages: 18,
            total_cost_usd: 0.08,
            avg_duration_ms: 1200,
            avg_time_to_first_token_ms: 250,
            top_provider: "OpenAI",
            top_model: "gpt-3.5-turbo",
          },
        ],
      })
    }

    if (type === "user" && userId) {
      return HttpResponse.json({
        stats: {
          totalTokens: 6912,
          totalMessages: 42,
          totalCost: 0.15,
          averageDuration: 1800,
          averageTimeToFirstToken: 350,
          topProvider: "OpenAI",
          topModel: "gpt-4",
        },
      })
    }

    // Mock legacy user analytics data (for older test format)
    return HttpResponse.json({
      userAnalytics: [
        {
          date: "2024-01-01",
          inputTokens: 1234,
          outputTokens: 5678,
          totalTokens: 6912,
          messageCount: 42,
        },
        {
          date: "2024-01-02",
          inputTokens: 2345,
          outputTokens: 6789,
          totalTokens: 9134,
          messageCount: 38,
        },
      ],
      totalInputTokens: 3579,
      totalOutputTokens: 12467,
      totalTokens: 16046,
      totalMessages: 80,
    })
  }),

  // Mock daily chart data API
  http.get("/api/analytics/daily-chart", () => {
    return HttpResponse.json({
      data: [
        {
          date: "2024-01-01",
          tokens: 1000,
          inputTokens: 400,
          outputTokens: 600,
          cachedTokens: 0,
          messages: 10,
          costUsd: 0.05,
        },
        {
          date: "2024-01-02",
          tokens: 1500,
          inputTokens: 600,
          outputTokens: 900,
          cachedTokens: 0,
          messages: 15,
          costUsd: 0.075,
        },
      ],
    })
  }),
]
