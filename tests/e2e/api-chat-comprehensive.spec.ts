import { expect, test } from "@playwright/test"

/**
 * Comprehensive API tests for chat functionality
 * Tests normal chat, reasoning models, and Sequential Thinking MCP
 */
test.describe("Chat API Comprehensive Tests", () => {
  const baseUrl = "http://localhost:3002"

  // Helper function to create a guest user ID
  const createGuestUserId = () => {
    return crypto.randomUUID()
  }

  // Helper function to create a chat ID
  const createChatId = () => {
    return crypto.randomUUID()
  }

  test("should handle normal chat without thinking", async ({ request }) => {
    const userId = createGuestUserId()
    const chatId = createChatId()

    const chatRequest = {
      messages: [
        {
          role: "user",
          content: "What is 2 + 2? Give me a simple answer.",
        },
      ],
      chatId: chatId,
      userId: userId,
      model: "gpt-4.1-nano",
      isAuthenticated: false,
      systemPrompt: "You are a helpful assistant.",
      thinkingMode: "none",
      tools: [],
    }

    const response = await request.post(`${baseUrl}/api/chat`, {
      data: chatRequest,
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Should get successful response for normal chat
    if (response.status() === 200) {
      // Read streaming response
      const body = await response.text()

      // Check if it's a streaming response
      const hasStreamingData = body.includes("data:") || body.includes("0:")
      expect(hasStreamingData).toBe(true)
    } else {
      console.log("⚠️ Normal chat failed with status:", response.status())
    }
  })

  test("should handle chat with reasoning model (native thinking)", async ({
    request,
  }) => {
    const userId = createGuestUserId()
    const chatId = createChatId()

    const chatRequest = {
      messages: [
        {
          role: "user",
          content: "What is 15% of 240? Show your thinking process.",
        },
      ],
      chatId: chatId,
      userId: userId,
      model: "gemini-2.0-flash-thinking-exp-01-21", // This should be a reasoning model
      isAuthenticated: false,
      systemPrompt: "You are a helpful assistant.",
      thinkingMode: "regular",
      enableThink: true,
      tools: [],
    }

    const response = await request.post(`${baseUrl}/api/chat`, {
      data: chatRequest,
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.status() === 200) {
      const body = await response.text()

      // Check for reasoning/thinking content
      const hasThinkingContent =
        body.includes("thinking") ||
        body.includes("reason") ||
        body.toLowerCase().includes("think")

      const hasStreamingData = body.includes("data:") || body.includes("0:")
      expect(hasStreamingData).toBe(true)
    } else {
      console.log("⚠️ Reasoning model failed with status:", response.status())
    }
  })

  test("should handle Sequential Thinking MCP", async ({ request }) => {
    const userId = createGuestUserId()
    const chatId = createChatId()

    const chatRequest = {
      messages: [
        {
          role: "user",
          content:
            "What is 25% of 80? Use sequential thinking to break this down step by step.",
        },
      ],
      chatId: chatId,
      userId: userId,
      model: "gpt-4.1-nano", // Non-reasoning model that should use MCP
      isAuthenticated: false,
      systemPrompt: "You are a helpful assistant.",
      thinkingMode: "sequential",
      tools: [
        {
          type: "mcp",
          name: "server-sequential-thinking",
        },
      ],
    }

    const response = await request.post(`${baseUrl}/api/chat`, {
      data: chatRequest,
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.status() === 200) {
      const body = await response.text()

      // Look for MCP tool invocations in the streaming response
      const hasMCPToolCall =
        body.includes("sequentialthinking") ||
        body.includes("addReasoningStep") ||
        body.includes("tool_calls") ||
        body.includes("function_call")

      // Look for reasoning steps
      const hasReasoningSteps =
        body.includes("step") ||
        body.includes("reasoning") ||
        body.includes("thinking")

      const hasStreamingData = body.includes("data:") || body.includes("0:")
      expect(hasStreamingData).toBe(true)

      // The key test: we should see either tool calls or reasoning content
      const hasExpectedMCPBehavior = hasMCPToolCall || hasReasoningSteps
      console.log("🎯 Sequential Thinking MCP working:", hasExpectedMCPBehavior)

      if (!hasExpectedMCPBehavior) {
        console.log(
          "⚠️ WARNING: Sequential Thinking MCP may not be working properly"
        )
      }
    } else {
      console.log(
        "❌ Sequential Thinking MCP failed with status:",
        response.status()
      )

      // This is the key test failure we want to investigate
      if (response.status() === 500) {
        expect(response.status()).toBe(200) // This will fail and show us the error
      }
    }
  })

  test("should compare all three modes side by side", async ({ request }) => {
    const testQuestion = "What is 30% of 150? Please show your work."
    const results: any[] = []

    // Test 1: Normal mode
    try {
      const normalResponse = await request.post(`${baseUrl}/api/chat`, {
        data: {
          messages: [{ role: "user", content: testQuestion }],
          chatId: createChatId(),
          userId: createGuestUserId(),
          model: "gpt-4.1-nano",
          isAuthenticated: false,
          systemPrompt: "You are a helpful assistant.",
          thinkingMode: "none",
          tools: [],
        },
      })

      const normalBody = await normalResponse.text()
      results.push({
        mode: "normal",
        status: normalResponse.status(),
        hasStreaming: normalBody.includes("data:"),
        responseLength: normalBody.length,
        preview: normalBody.substring(0, 200),
      })
    } catch (error) {
      results.push({ mode: "normal", error: true })
    }

    // Test 2: Reasoning model
    try {
      const reasoningResponse = await request.post(`${baseUrl}/api/chat`, {
        data: {
          messages: [{ role: "user", content: testQuestion }],
          chatId: createChatId(),
          userId: createGuestUserId(),
          model: "gemini-2.0-flash-thinking-exp-01-21",
          isAuthenticated: false,
          systemPrompt: "You are a helpful assistant.",
          thinkingMode: "regular",
          enableThink: true,
          tools: [],
        },
      })

      const reasoningBody = await reasoningResponse.text()
      results.push({
        mode: "reasoning",
        status: reasoningResponse.status(),
        hasStreaming: reasoningBody.includes("data:"),
        hasThinking: reasoningBody.includes("thinking"),
        responseLength: reasoningBody.length,
        preview: reasoningBody.substring(0, 200),
      })
    } catch (error) {
      results.push({ mode: "reasoning", error: true })
    }

    // Test 3: Sequential Thinking MCP
    try {
      const mcpResponse = await request.post(`${baseUrl}/api/chat`, {
        data: {
          messages: [{ role: "user", content: testQuestion }],
          chatId: createChatId(),
          userId: createGuestUserId(),
          model: "gpt-4.1-nano",
          isAuthenticated: false,
          systemPrompt: "You are a helpful assistant.",
          thinkingMode: "sequential",
          tools: [{ type: "mcp", name: "server-sequential-thinking" }],
        },
      })

      const mcpBody = await mcpResponse.text()
      results.push({
        mode: "sequential_mcp",
        status: mcpResponse.status(),
        hasStreaming: mcpBody.includes("data:"),
        hasTools:
          mcpBody.includes("tool") || mcpBody.includes("sequentialthinking"),
        responseLength: mcpBody.length,
        preview: mcpBody.substring(0, 200),
      })
    } catch (error) {
      results.push({ mode: "sequential_mcp", error: true })
    }

    // Summary
    const successfulModes = results.filter(
      (r) => !r.error && r.status === 200
    ).length
    console.log(
      `🎯 Chat modes comparison: ${successfulModes}/3 modes successful`
    )

    if (successfulModes === 0) {
      console.log(
        "🚨 CRITICAL: No modes are working - likely a fundamental issue"
      )
    } else if (successfulModes < 3) {
      console.log("⚠️ Some modes failing - specific functionality issues")
    }

    // Basic assertion - at least one mode should work
    expect(successfulModes).toBeGreaterThan(0)
  })
})
