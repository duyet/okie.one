import { expect, test } from "@playwright/test"

/**
 * Test to verify the enhanced system prompt encourages Sequential Thinking MCP usage
 * for questions that would benefit from step-by-step reasoning
 */
test.describe("Enhanced System Prompt - Sequential Thinking Encouragement", () => {
  const baseUrl = "http://localhost:3002"

  const createGuestUserId = () => crypto.randomUUID()
  const createChatId = () => crypto.randomUUID()

  test('should use tools for math questions even without explicit "step by step" request', async ({
    request,
  }) => {
    const chatRequest = {
      messages: [
        {
          role: "user",
          content: "What is 15% of 300?", // No explicit "step by step" request
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

    // Check if tools were used
    const hasToolInvocation =
      body.includes("sequentialthinking") ||
      body.includes("addReasoningStep") ||
      body.includes("toolCallId")

    // Check for reasoning content
    const hasReasoningContent =
      body.includes("15%") &&
      body.includes("300") &&
      (body.includes("step") ||
        body.includes("calculate") ||
        body.includes("multiply") ||
        body.includes("convert"))

    // With enhanced system prompt, math questions should trigger tools
    expect(hasToolInvocation).toBe(true)
    expect(hasReasoningContent).toBe(true)
  })

  test("should compare tool usage before and after system prompt enhancement", async ({
    request,
  }) => {
    const testCases = [
      {
        name: "Basic Math Question",
        message: "Calculate 20% of 500",
        shouldUseTool: true,
      },
      {
        name: "Word Problem",
        message:
          "If I have 100 apples and give away 30%, how many do I have left?",
        shouldUseTool: true,
      },
      {
        name: "Comparison Question",
        message: "Compare the benefits of electric vs gas cars",
        shouldUseTool: true,
      },
      {
        name: "Multi-step Problem",
        message:
          "How much would it cost to paint a room that is 12x15 feet with 9-foot ceilings?",
        shouldUseTool: true,
      },
      {
        name: "Simple Greeting",
        message: "hello",
        shouldUseTool: false,
      },
      {
        name: "Simple Fact",
        message: "What is the capital of France?",
        shouldUseTool: false,
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
        const actuallyUsedTools =
          body.includes("sequentialthinking") ||
          body.includes("addReasoningStep") ||
          body.includes("toolCallId")

        const result = {
          name: testCase.name,
          message: testCase.message,
          expectedTool: testCase.shouldUseTool,
          actuallyUsedTools,
          correct: testCase.shouldUseTool === actuallyUsedTools,
          responseLength: body.length,
          status: response.status(),
          error: false,
        }

        results.push(result)
      } catch (error) {
        results.push({
          name: testCase.name,
          message: testCase.message,
          expectedTool: testCase.shouldUseTool,
          actuallyUsedTools: false,
          correct: false,
          responseLength: 0,
          status: 0,
          error: true,
        })
      }
    }

    // Log summary results for debugging
    const correctResults = results.filter((r) => r.correct && !r.error).length
    const totalResults = results.filter((r) => !r.error).length
    console.log(
      `📊 Success Rate: ${correctResults}/${totalResults} tests passed`
    )

    const successRate = totalResults > 0 ? correctResults / totalResults : 0

    // Analyze specific categories
    const mathResults = results.filter(
      (r) => r.name.includes("Math") || r.name.includes("Word Problem")
    )
    const mathToolUsage = mathResults.filter(
      (r) => !r.error && r.actuallyUsedTools
    ).length

    const complexResults = results.filter(
      (r) => r.name.includes("Comparison") || r.name.includes("Multi-step")
    )
    const complexToolUsage = complexResults.filter(
      (r) => !r.error && r.actuallyUsedTools
    ).length

    const simpleResults = results.filter(
      (r) => r.name.includes("Greeting") || r.name.includes("Simple Fact")
    )
    const simpleToolUsage = simpleResults.filter(
      (r) => !r.error && r.actuallyUsedTools
    ).length

    // Test should pass if we have good tool usage for appropriate questions
    expect(successRate).toBeGreaterThanOrEqual(0.7) // At least 70% correct behavior

    // Math questions should use tools more often now
    if (mathResults.length > 0) {
      const mathToolRate = mathToolUsage / mathResults.length
      expect(mathToolRate).toBeGreaterThanOrEqual(0.5) // At least 50% of math questions should use tools
    }

    // Simple questions should rarely use tools
    if (simpleResults.length > 0) {
      const simpleToolRate = simpleToolUsage / simpleResults.length
      expect(simpleToolRate).toBeLessThanOrEqual(0.3) // At most 30% of simple questions should use tools
    }
  })
})
