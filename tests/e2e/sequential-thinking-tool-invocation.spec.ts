import { expect, test } from "@playwright/test"

/**
 * Test to verify when Sequential Thinking MCP tools are invoked vs not invoked
 * Covers the case where simple messages like "hello" shouldn't trigger tools
 * while complex reasoning tasks should trigger MCP tools
 */
test.describe("Sequential Thinking MCP - Tool Invocation Logic", () => {
  const baseUrl = "http://localhost:3002"

  const createGuestUserId = () => crypto.randomUUID()
  const createChatId = () => crypto.randomUUID()

  test("should NOT invoke Sequential Thinking MCP for simple greetings", async ({
    request,
  }) => {
    const chatRequest = {
      messages: [
        {
          role: "user",
          content: "hello",
        },
      ],
      chatId: createChatId(),
      userId: createGuestUserId(),
      model: "gpt-4.1-nano",
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

    expect(response.status()).toBe(200)

    const body = await response.text()

    // Check that NO MCP tools were called
    const hasMCPToolCall =
      body.includes("addReasoningStep") ||
      body.includes("sequentialthinking") ||
      body.includes("toolCallId") ||
      body.includes("toolName")

    // Check that it's a simple greeting response
    const isSimpleGreeting =
      body.includes("Hello") ||
      body.includes("Hi") ||
      body.includes("help") ||
      body.includes("How can")

    // Assertions
    expect(hasMCPToolCall).toBe(false) // Should NOT invoke tools for greeting
    expect(isSimpleGreeting).toBe(true) // Should be a normal greeting
  })

  test("should invoke Sequential Thinking MCP for complex reasoning tasks", async ({
    request,
  }) => {
    const chatRequest = {
      messages: [
        {
          role: "user",
          content:
            "What is 25% of 240? Break this down step by step using sequential thinking.",
        },
      ],
      chatId: createChatId(),
      userId: createGuestUserId(),
      model: "gpt-4.1-nano",
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

    expect(response.status()).toBe(200)

    const body = await response.text()

    // Check that MCP tools WERE called
    const hasMCPToolCall =
      body.includes("addReasoningStep") ||
      body.includes("sequentialthinking") ||
      body.includes("toolCallId") ||
      body.includes("toolName")

    // Check for reasoning content
    const hasReasoningContent =
      body.includes("25%") &&
      body.includes("240") &&
      (body.includes("step") || body.includes("calculate"))

    // Assertions
    expect(hasMCPToolCall).toBe(true) // Should invoke tools for complex reasoning
    expect(hasReasoningContent).toBe(true) // Should contain reasoning about the math problem
  })

  test("should compare tool invocation behavior between simple and complex messages", async ({
    request,
  }) => {
    const testCases = [
      {
        name: "Simple Greeting",
        message: "hi there",
        expectsTools: false,
        description: "Basic greeting should not trigger tools",
      },
      {
        name: "Simple Question",
        message: "what is the weather like?",
        expectsTools: false,
        description: "Simple factual question should not trigger tools",
      },
      {
        name: "Math Problem",
        message: "Calculate 15% of 300 step by step",
        expectsTools: true,
        description: "Math calculation should trigger sequential thinking",
      },
      {
        name: "Complex Analysis",
        message:
          "Analyze the pros and cons of renewable energy sources, breaking down each point systematically",
        expectsTools: true,
        description: "Complex analysis should trigger sequential thinking",
      },
    ]

    const results = []

    for (const testCase of testCases) {
      try {
        const response = await request.post(`${baseUrl}/api/chat`, {
          data: {
            messages: [{ role: "user", content: testCase.message }],
            chatId: createChatId(),
            userId: createGuestUserId(),
            model: "gpt-4.1-nano",
            isAuthenticated: false,
            systemPrompt: "You are a helpful assistant.",
            thinkingMode: "sequential",
            tools: [{ type: "mcp", name: "server-sequential-thinking" }],
          },
          headers: { "Content-Type": "application/json" },
        })

        const body = await response.text()
        const actuallyInvokedTools =
          body.includes("addReasoningStep") ||
          body.includes("sequentialthinking") ||
          body.includes("toolCallId")

        const result = {
          name: testCase.name,
          message: testCase.message,
          expectedTools: testCase.expectsTools,
          actuallyInvokedTools,
          correct: testCase.expectsTools === actuallyInvokedTools,
          responseLength: body.length,
          status: response.status(),
          error: false,
        }

        results.push(result)
      } catch (error) {
        results.push({
          name: testCase.name,
          message: testCase.message,
          expectedTools: testCase.expectsTools,
          actuallyInvokedTools: false,
          correct: false,
          responseLength: 0,
          status: 0,
          error: true,
        })
      }
    }

    const correctResults = results.filter((r) => r.correct).length
    const totalResults = results.length

    console.log(
      `🎯 Tool invocation test: ${correctResults}/${totalResults} tests passed`
    )

    // Test should pass if at least 75% of cases behave correctly
    const successRate = correctResults / totalResults
    expect(successRate).toBeGreaterThanOrEqual(0.75)

    // Specific assertions for the key cases
    const greetingResult = results.find((r) => r.name === "Simple Greeting")
    const mathResult = results.find((r) => r.name === "Math Problem")

    if (greetingResult && !greetingResult.error) {
      expect(greetingResult.actuallyInvokedTools).toBe(false)
    }

    if (mathResult && !mathResult.error) {
      expect(mathResult.actuallyInvokedTools).toBe(true)
    }

    // Test completed
  })
})
