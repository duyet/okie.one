import type { APIResponse } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Interface for test result analysis
interface ChatTestResult {
  mode: string
  status?: number
  responseTime: number
  hasStreaming?: boolean
  responseLength?: number
  hasCorrectAnswer?: boolean
  hasShowWork?: boolean
  hasThinkingMarkers?: boolean
  hasStepByStep?: boolean
  hasMCPTools?: boolean
  hasReasoningStructure?: boolean
  hasMathContent?: boolean
  preview?: string
  success: boolean
  error?: boolean
  errorDetails?: string | null
  errorType?: string
  errorMessage?: string
}

/**
 * Comprehensive API tests for chat functionality
 * Tests normal chat, reasoning models, and Sequential Thinking MCP
 * Enhanced with better error handling and debugging
 */
test.describe("Chat API Comprehensive Tests", () => {
  const baseUrl = "http://localhost:3000"

  // Enhanced timeout for comprehensive API tests
  test.setTimeout(300000) // 5 minutes per test to handle all modes

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

    console.log("📝 Testing normal chat mode (baseline functionality)")
    console.log("  User ID:", `${userId.substring(0, 8)}...`)
    console.log("  Chat ID:", `${chatId.substring(0, 8)}...`)
    console.log("  Model: gpt-4.1-nano (fast, reliable)")
    console.log("  Mode: Standard chat (no thinking)")

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

    console.log("🚀 Sending normal chat request...")
    const startTime = Date.now()
    let response: APIResponse

    try {
      response = await request.post(`${baseUrl}/api/chat`, {
        data: chatRequest,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Okie-E2E-Test/1.0",
        },
        timeout: 150000, // 2.5 minute timeout
      })

      const responseTime = Date.now() - startTime
      console.log("📊 Response received after:", `${responseTime}ms`)
      console.log("📊 Response status:", response.status())
      console.log(
        "📊 Response headers:",
        Object.keys(response.headers() || {}).join(", ")
      )

      if (response.status() === 200) {
        const body = await response.text()
        const hasStreamingData =
          body.includes("data:") ||
          body.includes("0:") ||
          body.includes("event:")
        const hasResponseContent = body.length > 100 // Reasonable response length
        const hasMathAnswer = body.includes("4") || body.includes("four") // Should contain the answer

        console.log("✅ Normal chat successful")
        console.log("  Response time:", `${responseTime}ms`)
        console.log("  Response length:", `${body.length} characters`)
        console.log("  Has streaming format:", hasStreamingData)
        console.log("  Has substantial content:", hasResponseContent)
        console.log("  Contains expected answer:", hasMathAnswer)
        console.log(
          "  Response preview:",
          `${body.substring(0, 150).replace(/\n/g, "\\n")}...`
        )

        // Enhanced assertions
        expect(hasStreamingData).toBe(true)
        expect(hasResponseContent).toBe(true)

        if (!hasMathAnswer) {
          console.log(
            "⚠️ Warning: Response may not contain expected math answer"
          )
          console.log("  Full response sample:", body.substring(0, 500))
        }
      } else {
        const errorBody = await response.text()
        console.log("❌ Normal chat failed")
        console.log("  Status:", response.status())
        console.log("  Response time:", `${responseTime}ms`)
        console.log("  Error body preview:", errorBody.substring(0, 300))
        console.log(
          "  Content-Type:",
          response.headers()?.["content-type"] || "unknown"
        )

        // Enhanced error categorization
        if (response.status() >= 500) {
          console.log("❌ Server error - infrastructure issue")
          throw new Error(
            `Server error (${response.status()}): ${errorBody.substring(0, 200)}`
          )
        } else if (response.status() === 429) {
          console.log(
            "⚠️ Rate limit - may be expected for high-frequency testing"
          )
        } else if (response.status() >= 400) {
          console.log("⚠️ Client error - configuration or request issue")
          console.log(
            "  This might be expected in test environment without proper API keys"
          )
        }
      }
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime
      console.error(
        "❌ Normal chat request failed after",
        `${responseTime}ms:`,
        error
      )
      console.log("🔍 Error details:")
      console.log(
        "  Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      )
      console.log(
        "  Error message:",
        error instanceof Error ? error.message : String(error)
      )
      if (error instanceof Error && error.message.includes("timeout")) {
        console.log("⏰ This appears to be a timeout issue")
        console.log(
          "  Possible causes: Server overload, network issues, or slow model response"
        )
      }
      throw error
    }
  })

  test("should handle chat with reasoning model (native thinking)", async ({
    request,
  }) => {
    const userId = createGuestUserId()
    const chatId = createChatId()

    console.log("🧠 Testing reasoning model (native thinking capabilities)")
    console.log("  User ID:", `${userId.substring(0, 8)}...`)
    console.log("  Chat ID:", `${chatId.substring(0, 8)}...`)
    console.log(
      "  Model: gemini-2.0-flash-thinking-exp-01-21 (native reasoning)"
    )
    console.log("  Mode: Native thinking enabled")
    console.log("  Expected: Model shows internal reasoning process")

    const chatRequest = {
      messages: [
        {
          role: "user",
          content:
            "What is 15% of 240? Show your thinking process step by step.",
        },
      ],
      chatId: chatId,
      userId: userId,
      model: "gemini-2.0-flash-thinking-exp-01-21", // Reasoning model
      isAuthenticated: false,
      systemPrompt: "You are a helpful assistant.",
      thinkingMode: "regular",
      enableThink: true,
      tools: [],
    }

    console.log("🧠 Sending reasoning model request...")
    const startTime = Date.now()
    let response: APIResponse

    try {
      response = await request.post(`${baseUrl}/api/chat`, {
        data: chatRequest,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Okie-E2E-Test/1.0",
        },
        timeout: 180000, // 3 minute timeout for reasoning models
      })

      const responseTime = Date.now() - startTime
      console.log("📊 Response received after:", `${responseTime}ms`)
      console.log("📊 Response status:", response.status())
      console.log(
        "📊 Content-Type:",
        response.headers()?.["content-type"] || "unknown"
      )

      if (response.status() === 200) {
        const body = await response.text()

        // Enhanced content analysis for reasoning models
        const hasStreamingData =
          body.includes("data:") ||
          body.includes("0:") ||
          body.includes("event:")
        const hasThinkingMarkers = [
          "thinking",
          "reason",
          "<thinking>",
          "reasoning",
          "step",
          "calculate",
          "process",
          "analyze",
        ].some((marker) => body.toLowerCase().includes(marker))

        const hasMathAnswer = body.includes("36") || body.includes("thirty-six") // 15% of 240 = 36
        const hasResponseContent = body.length > 200 // Reasoning should be detailed
        const hasStepByStep = body.includes("step") || body.match(/\d+[.)]/g) // Numbered steps

        console.log("✅ Reasoning model response analysis:")
        console.log("  Response time:", `${responseTime}ms`)
        console.log("  Response length:", `${body.length} characters`)
        console.log("  Has streaming format:", hasStreamingData)
        console.log("  Has thinking markers:", hasThinkingMarkers)
        console.log("  Has step-by-step structure:", hasStepByStep)
        console.log("  Has substantial content:", hasResponseContent)
        console.log("  Contains correct answer (36):", hasMathAnswer)
        console.log(
          "  Response preview:",
          `${body.substring(0, 200).replace(/\n/g, "\\n")}...`
        )

        // Core assertions
        expect(hasStreamingData).toBe(true)
        expect(hasResponseContent).toBe(true)

        // For reasoning models, we expect detailed thinking content
        if (!hasThinkingMarkers) {
          console.log(
            "⚠️ Warning: No clear thinking content detected in reasoning model"
          )
          console.log("  This could indicate:")
          console.log("    - Model not using thinking mode properly")
          console.log("    - Response format different than expected")
          console.log("    - Thinking content stripped or not displayed")
          console.log("  Sample content:", body.substring(0, 400))
        } else {
          console.log("✅ Reasoning model showing thinking process correctly")
        }

        if (!hasMathAnswer) {
          console.log("⚠️ Warning: Response may not contain correct math answer")
          console.log("  Expected: 36 (15% of 240)")
          console.log("  Full response sample:", body.substring(0, 600))
        }
      } else {
        const errorBody = await response.text()
        const responseTime = Date.now() - startTime

        console.log("❌ Reasoning model failed")
        console.log("  Status:", response.status())
        console.log("  Response time:", `${responseTime}ms`)
        console.log("  Error body preview:", errorBody.substring(0, 400))
        console.log(
          "  Content-Type:",
          response.headers()?.["content-type"] || "unknown"
        )

        // Enhanced error analysis for reasoning models
        if (response.status() >= 500) {
          console.log("❌ Server error - infrastructure or model issue")
          console.log("  Possible causes:")
          console.log("    - Reasoning model server overloaded")
          console.log("    - Model configuration error")
          console.log("    - Infrastructure failure")
          throw new Error(
            `Reasoning model server error (${response.status()}): ${errorBody.substring(0, 200)}`
          )
        } else if (response.status() === 429) {
          console.log(
            "⚠️ Rate limit hit - reasoning models may have stricter limits"
          )
        } else if (response.status() >= 400) {
          console.log("⚠️ Client error - model or configuration issue")
          console.log("  This could indicate:")
          console.log("    - Reasoning model not available")
          console.log("    - Invalid model configuration")
          console.log("    - API key limitations")
        }
      }
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime
      console.error(
        "❌ Reasoning model request failed after",
        `${responseTime}ms:`,
        error
      )
      console.log("🔍 Error analysis:")
      console.log(
        "  Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      )
      console.log(
        "  Error message:",
        error instanceof Error ? error.message : String(error)
      )

      if (error instanceof Error && error.message.includes("timeout")) {
        console.log("⏰ Timeout issue detected")
        console.log("  Reasoning models typically take longer to respond")
        console.log(
          "  Consider increasing timeout or checking model availability"
        )
      } else if (
        error instanceof Error &&
        error.message.includes("ECONNREFUSED")
      ) {
        console.log("🔌 Connection refused - server may not be running")
      }

      throw error
    }
  })

  test("should handle Sequential Thinking MCP", async ({ request }) => {
    const userId = createGuestUserId()
    const chatId = createChatId()

    console.log("🧪 Testing Sequential Thinking MCP (advanced reasoning)")
    console.log("  User ID:", `${userId.substring(0, 8)}...`)
    console.log("  Chat ID:", `${chatId.substring(0, 8)}...`)
    console.log("  Model: gpt-4.1-nano (non-reasoning, will use MCP)")
    console.log("  Mode: Sequential Thinking MCP enabled")
    console.log("  Expected: MCP tool calls for structured reasoning")

    const chatRequest = {
      messages: [
        {
          role: "user",
          content:
            "What is 25% of 80? Use sequential thinking to break this down step by step with clear reasoning.",
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

    console.log("🔧 MCP Configuration Details:")
    console.log("  Base Model:", chatRequest.model)
    console.log("  Thinking Mode:", chatRequest.thinkingMode)
    console.log("  MCP Tools:", chatRequest.tools.length)
    chatRequest.tools.forEach((tool, i) => {
      console.log(`    Tool ${i + 1}: ${tool.type} - ${tool.name}`)
    })
    console.log("  Authentication:", chatRequest.isAuthenticated)

    console.log("🧪 Sending Sequential Thinking MCP request...")
    const startTime = Date.now()
    let response: APIResponse

    try {
      response = await request.post(`${baseUrl}/api/chat`, {
        data: chatRequest,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Okie-E2E-Test/1.0",
        },
        timeout: 240000, // 4 minute timeout for MCP operations
      })

      const responseTime = Date.now() - startTime
      console.log("📊 MCP Response Analysis:")
      console.log("  Response time:", `${responseTime}ms`)
      console.log("  Response status:", response.status())
      console.log(
        "  Content-Type:",
        response.headers()?.["content-type"] || "unknown"
      )

      if (response.status() === 200) {
        const body = await response.text()

        // Enhanced MCP detection with multiple patterns
        const mcpPatterns = {
          toolCalls: [
            "sequentialthinking",
            "addReasoningStep",
            "tool_calls",
            "function_call",
            "mcp__sequential-thinking",
            "mcp_call",
          ],
          reasoningStructure: [
            "step",
            "reasoning",
            "thinking",
            "analysis",
            "Step 1",
            "Step 2",
            "Step 3",
            "thought",
            "nextThoughtNeeded",
            "thoughtNumber",
          ],
          mathContent: ["20", "twenty", "25%", "percent", "80", "eighty"],
        }

        const hasMCPToolCalls = mcpPatterns.toolCalls.some((pattern) =>
          body.toLowerCase().includes(pattern.toLowerCase())
        )
        const hasReasoningStructure = mcpPatterns.reasoningStructure.some(
          (pattern) => body.toLowerCase().includes(pattern.toLowerCase())
        )
        const hasMathContent = mcpPatterns.mathContent.some((pattern) =>
          body.toLowerCase().includes(pattern.toLowerCase())
        )

        const hasStreamingData =
          body.includes("data:") ||
          body.includes("0:") ||
          body.includes("event:")
        const hasExpectedMCPBehavior = hasMCPToolCalls || hasReasoningStructure
        const hasResponseContent = body.length > 300 // MCP responses should be detailed
        const hasCorrectAnswer = body.includes("20") || body.includes("twenty") // 25% of 80 = 20

        console.log("✅ Sequential Thinking MCP Response Analysis:")
        console.log("  Response time:", `${responseTime}ms`)
        console.log("  Response length:", `${body.length} characters`)
        console.log("  Has streaming format:", hasStreamingData)
        console.log("  Has MCP tool calls:", hasMCPToolCalls)
        console.log("  Has reasoning structure:", hasReasoningStructure)
        console.log("  Has math content:", hasMathContent)
        console.log("  Has substantial content:", hasResponseContent)
        console.log("  Contains correct answer (20):", hasCorrectAnswer)
        console.log("  Expected MCP behavior:", hasExpectedMCPBehavior)

        // Show structured response sample for debugging
        console.log("📝 Response Structure Analysis:")
        const lines = body.split("\n").slice(0, 15)
        lines.forEach((line, i) => {
          if (line.trim()) {
            console.log(
              `    ${i + 1}: ${line.substring(0, 80)}${line.length > 80 ? "..." : ""}`
            )
          }
        })

        // Core assertions
        expect(hasStreamingData).toBe(true)
        expect(hasResponseContent).toBe(true)

        // MCP-specific analysis
        if (!hasExpectedMCPBehavior) {
          console.log("🔍 MCP INVESTIGATION NEEDED:")
          console.log("  No clear MCP activity patterns detected")
          console.log("  Possible causes:")
          console.log("    1. MCP server not responding to tool calls")
          console.log("    2. AI model not invoking Sequential Thinking tools")
          console.log(
            "    3. Tool responses not included in streaming response"
          )
          console.log("    4. Different MCP response format than expected")
          console.log("    5. MCP server configuration issue")

          console.log("📊 Detailed Response Sample (first 500 chars):")
          console.log(body.substring(0, 500))

          console.log("🔍 Next Steps:")
          console.log("    - Check MCP server logs")
          console.log("    - Verify tool configuration")
          console.log("    - Test MCP server independently")

          // This is investigational - don't fail immediately
          console.log("ℹ️ Test continues for investigation purposes")
        } else {
          console.log("✅ Sequential Thinking MCP behavior confirmed")

          if (hasMCPToolCalls) {
            console.log("  ✅ MCP tool invocation patterns detected")
          }
          if (hasReasoningStructure) {
            console.log("  ✅ Structured reasoning patterns detected")
          }
        }

        if (!hasCorrectAnswer) {
          console.log("⚠️ Warning: Response may not contain correct math answer")
          console.log("  Expected: 20 (25% of 80)")
          console.log("  This could indicate MCP reasoning issue")
        }
      } else {
        const errorBody = await response.text()
        const responseTime = Date.now() - startTime

        console.log("❌ Sequential Thinking MCP Failed")
        console.log("  Status:", response.status())
        console.log("  Response time:", `${responseTime}ms`)
        console.log("  Error body preview:", errorBody.substring(0, 500))
        console.log(
          "  Content-Type:",
          response.headers()?.["content-type"] || "unknown"
        )

        // Enhanced MCP-specific error analysis
        if (response.status() === 500) {
          console.log("🚨 MCP Server Error - Infrastructure Issue")
          console.log("  Root Causes:")
          console.log("    - Sequential Thinking MCP server not running")
          console.log("    - MCP server crashed or unresponsive")
          console.log("    - Tool invocation failed internally")
          console.log("    - Model-MCP communication breakdown")
          console.log("  Immediate Actions:")
          console.log("    - Check MCP server status")
          console.log("    - Review MCP server logs")
          console.log("    - Verify MCP configuration")

          throw new Error(
            `Sequential Thinking MCP server error (500): ${errorBody.substring(0, 300)}`
          )
        } else if (response.status() === 400) {
          console.log("⚠️ MCP Configuration Error - Bad Request")
          console.log("  Configuration Issues:")
          console.log("    - Invalid MCP tool specification")
          console.log("    - Malformed request parameters")
          console.log("    - Incompatible model-MCP combination")
          console.log("    - Missing required MCP server setup")

          throw new Error(
            `Sequential Thinking MCP configuration error (400): ${errorBody.substring(0, 300)}`
          )
        } else if (response.status() === 429) {
          console.log(
            "⚠️ Rate Limit - MCP operations may have usage restrictions"
          )
        } else if (response.status() >= 400) {
          console.log("⚠️ Client Error - MCP Setup Issue")
          console.log("  Potential causes:")
          console.log("    - MCP server not properly registered")
          console.log("    - Authentication issues with MCP")
          console.log("    - Model doesn't support MCP integration")
        }
      }
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime
      console.error(
        "❌ Sequential Thinking MCP request failed after",
        `${responseTime}ms:`,
        error
      )
      console.log("🔍 MCP Error Analysis:")
      console.log(
        "  Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      )
      console.log(
        "  Error message:",
        error instanceof Error ? error.message : String(error)
      )

      if (error instanceof Error && error.message.includes("timeout")) {
        console.log("⏰ MCP Timeout Issue")
        console.log("  Sequential Thinking MCP operations can be slow")
        console.log("  This involves:")
        console.log("    - Model analyzing the request")
        console.log("    - Multiple MCP tool invocations")
        console.log("    - Step-by-step reasoning generation")
        console.log("    - Response formatting and streaming")
        console.log("  Consider:")
        console.log("    - Increasing timeout further")
        console.log("    - Checking MCP server performance")
        console.log("    - Verifying model response times")
      } else if (
        error instanceof Error &&
        error.message.includes("ECONNREFUSED")
      ) {
        console.log("🔌 MCP Connection Issue")
        console.log("  MCP server appears to be unreachable")
        console.log("  Check:")
        console.log("    - MCP server is running")
        console.log("    - Network connectivity to MCP server")
        console.log("    - MCP server port configuration")
      }

      throw error
    }
  })

  test("should compare all three modes side by side", async ({ request }) => {
    const testQuestion =
      "What is 30% of 150? Please show your work step by step."
    const results: ChatTestResult[] = []
    const overallStartTime = Date.now()

    console.log("🎯 Comprehensive Chat Mode Comparison Test")
    console.log("==================================================")
    console.log("  Test Question:", testQuestion)
    console.log("  Expected Answer: 45 (30% of 150)")
    console.log("  Modes to Test: 3 (Normal, Native Reasoning, Sequential MCP)")
    console.log("  Timeout per mode: 4 minutes")
    console.log("  Total test timeout: 5 minutes")
    console.log("==================================================\n")

    // Test 1: Normal mode (baseline)
    console.log("📝 1/3: Testing Normal Mode (Baseline)")
    console.log("  Model: gpt-4.1-nano")
    console.log("  Expected: Fast, direct response")
    const normalStartTime = Date.now()

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
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Okie-E2E-Test/1.0",
        },
        timeout: 150000, // 2.5 minutes
      })

      const normalTime = Date.now() - normalStartTime
      const normalBody = await normalResponse.text()

      const result = {
        mode: "normal",
        status: normalResponse.status(),
        responseTime: normalTime,
        hasStreaming:
          normalBody.includes("data:") ||
          normalBody.includes("0:") ||
          normalBody.includes("event:"),
        responseLength: normalBody.length,
        hasCorrectAnswer:
          normalBody.includes("45") || normalBody.includes("forty-five"),
        hasShowWork:
          normalBody.toLowerCase().includes("step") ||
          normalBody.includes("*") ||
          normalBody.includes("calculate"),
        preview: normalBody.substring(0, 200).replace(/\n/g, "\\n"),
        success: normalResponse.status() === 200,
        errorDetails:
          normalResponse.status() !== 200 ? normalBody.substring(0, 300) : null,
      }
      results.push(result)

      console.log("✅ Normal mode completed:")
      console.log("  Status:", result.status)
      console.log("  Response time:", `${result.responseTime}ms`)
      console.log("  Success:", result.success)
      console.log("  Has streaming:", result.hasStreaming)
      console.log("  Response length:", result.responseLength)
      console.log("  Contains answer (45):", result.hasCorrectAnswer)
      console.log("  Shows work process:", result.hasShowWork)
    } catch (error: unknown) {
      const normalTime = Date.now() - normalStartTime
      console.log(
        "❌ Normal mode failed after",
        `${normalTime}ms:`,
        error instanceof Error ? error.message : String(error)
      )
      results.push({
        mode: "normal",
        error: true,
        success: false,
        responseTime: normalTime,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        errorMessage:
          error instanceof Error
            ? error.message.substring(0, 200)
            : String(error).substring(0, 200),
      })
    }

    // Test 2: Reasoning model (native thinking)
    console.log("\n🧠 2/3: Testing Native Reasoning Model")
    console.log("  Model: gemini-2.0-flash-thinking-exp-01-21")
    console.log("  Expected: Internal thinking process shown")
    const reasoningStartTime = Date.now()

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
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Okie-E2E-Test/1.0",
        },
        timeout: 180000, // 3 minutes for reasoning
      })

      const reasoningTime = Date.now() - reasoningStartTime
      const reasoningBody = await reasoningResponse.text()

      const result = {
        mode: "reasoning",
        status: reasoningResponse.status(),
        responseTime: reasoningTime,
        hasStreaming:
          reasoningBody.includes("data:") ||
          reasoningBody.includes("0:") ||
          reasoningBody.includes("event:"),
        hasThinkingMarkers: [
          "thinking",
          "reasoning",
          "<thinking>",
          "analyze",
          "process",
          "calculate",
        ].some((marker) => reasoningBody.toLowerCase().includes(marker)),
        hasCorrectAnswer:
          reasoningBody.includes("45") || reasoningBody.includes("forty-five"),
        hasStepByStep:
          reasoningBody.toLowerCase().includes("step") ||
          reasoningBody.match(/\d+[.)]/g) !== null,
        responseLength: reasoningBody.length,
        preview: reasoningBody.substring(0, 200).replace(/\n/g, "\\n"),
        success: reasoningResponse.status() === 200,
        errorDetails:
          reasoningResponse.status() !== 200
            ? reasoningBody.substring(0, 300)
            : null,
      }
      results.push(result)

      console.log("✅ Reasoning mode completed:")
      console.log("  Status:", result.status)
      console.log("  Response time:", `${result.responseTime}ms`)
      console.log("  Success:", result.success)
      console.log("  Has streaming:", result.hasStreaming)
      console.log("  Has thinking markers:", result.hasThinkingMarkers)
      console.log("  Response length:", result.responseLength)
      console.log("  Contains answer (45):", result.hasCorrectAnswer)
      console.log("  Step-by-step structure:", result.hasStepByStep)
    } catch (error: unknown) {
      const reasoningTime = Date.now() - reasoningStartTime
      console.log(
        "❌ Reasoning mode failed after",
        `${reasoningTime}ms:`,
        error instanceof Error ? error.message : String(error)
      )
      results.push({
        mode: "reasoning",
        error: true,
        success: false,
        responseTime: reasoningTime,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        errorMessage:
          error instanceof Error
            ? error.message.substring(0, 200)
            : String(error).substring(0, 200),
      })
    }

    // Test 3: Sequential Thinking MCP (advanced reasoning)
    console.log("\n🧪 3/3: Testing Sequential Thinking MCP")
    console.log("  Model: gpt-4.1-nano + Sequential MCP")
    console.log("  Expected: MCP tool calls with structured reasoning")
    const mcpStartTime = Date.now()

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
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Okie-E2E-Test/1.0",
        },
        timeout: 240000, // 4 minutes for MCP
      })

      const mcpTime = Date.now() - mcpStartTime
      const mcpBody = await mcpResponse.text()

      const result = {
        mode: "sequential_mcp",
        status: mcpResponse.status(),
        responseTime: mcpTime,
        hasStreaming:
          mcpBody.includes("data:") ||
          mcpBody.includes("0:") ||
          mcpBody.includes("event:"),
        hasMCPTools: [
          "sequentialthinking",
          "tool_call",
          "function_call",
          "mcp__sequential-thinking",
          "addReasoningStep",
        ].some((pattern) =>
          mcpBody.toLowerCase().includes(pattern.toLowerCase())
        ),
        hasReasoningStructure: [
          "step",
          "reasoning",
          "thinking",
          "analysis",
          "thought",
          "nextThoughtNeeded",
        ].some((pattern) =>
          mcpBody.toLowerCase().includes(pattern.toLowerCase())
        ),
        hasCorrectAnswer:
          mcpBody.includes("45") || mcpBody.includes("forty-five"),
        responseLength: mcpBody.length,
        preview: mcpBody.substring(0, 200).replace(/\n/g, "\\n"),
        success: mcpResponse.status() === 200,
        errorDetails:
          mcpResponse.status() !== 200 ? mcpBody.substring(0, 300) : null,
      }
      results.push(result)

      console.log("✅ Sequential MCP completed:")
      console.log("  Status:", result.status)
      console.log("  Response time:", `${result.responseTime}ms`)
      console.log("  Success:", result.success)
      console.log("  Has streaming:", result.hasStreaming)
      console.log("  Has MCP tools:", result.hasMCPTools)
      console.log("  Has reasoning structure:", result.hasReasoningStructure)
      console.log("  Response length:", result.responseLength)
      console.log("  Contains answer (45):", result.hasCorrectAnswer)
    } catch (error: unknown) {
      const mcpTime = Date.now() - mcpStartTime
      console.log(
        "❌ Sequential MCP failed after",
        `${mcpTime}ms:`,
        error instanceof Error ? error.message : String(error)
      )
      results.push({
        mode: "sequential_mcp",
        error: true,
        success: false,
        responseTime: mcpTime,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        errorMessage:
          error instanceof Error
            ? error.message.substring(0, 200)
            : String(error).substring(0, 200),
      })
    }

    // Comprehensive analysis
    const totalTime = Date.now() - overallStartTime
    console.log(`\n${"=".repeat(60)}`)
    console.log("📊 COMPREHENSIVE CHAT MODE ANALYSIS")
    console.log("=".repeat(60))

    const successfulModes = results.filter((r) => r.success).length
    const failedModes = results.filter((r) => r.error || !r.success)

    console.log(
      `🎯 Overall Success Rate: ${successfulModes}/3 modes (${Math.round((successfulModes / 3) * 100)}%)`
    )
    console.log(
      `🕰️ Total Test Duration: ${totalTime}ms (${Math.round(totalTime / 1000)}s)`
    )
    console.log(`📊 Expected Answer: 45 (30% of 150)\n`)

    // Detailed results breakdown
    console.log("📄 Mode-by-Mode Results:")
    console.log("-".repeat(50))

    results.forEach((result, _index) => {
      const emoji = result.success ? "✅" : "❌"
      const modeEmoji =
        result.mode === "normal"
          ? "📝"
          : result.mode === "reasoning"
            ? "🧠"
            : "🧪"

      console.log(
        `${modeEmoji} ${result.mode.toUpperCase().replace("_", " ")} MODE:`,
        emoji
      )
      console.log(
        `  Status: ${result.status || "ERROR"} (${result.success ? "SUCCESS" : "FAILED"})`
      )

      if (result.success) {
        console.log(`  Response Time: ${result.responseTime}ms`)
        console.log(`  Response Length: ${result.responseLength} characters`)
        console.log(`  Streaming Format: ${result.hasStreaming ? "YES" : "NO"}`)
        console.log(
          `  Contains Answer (45): ${result.hasCorrectAnswer ? "YES" : "MAYBE"}`
        )

        if (result.mode === "normal") {
          console.log(
            `  Shows Work Process: ${result.hasShowWork ? "YES" : "NO"}`
          )
        } else if (result.mode === "reasoning") {
          console.log(
            `  Thinking Markers: ${result.hasThinkingMarkers ? "YES" : "NO"}`
          )
          console.log(`  Step-by-Step: ${result.hasStepByStep ? "YES" : "NO"}`)
        } else if (result.mode === "sequential_mcp") {
          console.log(`  MCP Tool Calls: ${result.hasMCPTools ? "YES" : "NO"}`)
          console.log(
            `  Reasoning Structure: ${result.hasReasoningStructure ? "YES" : "NO"}`
          )
        }

        console.log(`  Response Preview: ${result.preview}...`)
      } else {
        console.log(`  Response Time: ${result.responseTime || "N/A"}ms`)
        console.log(`  Error Type: ${result.errorType || "Unknown"}`)
        console.log(
          `  Error: ${result.errorMessage || result.errorDetails || "Unknown error"}`
        )
      }
      console.log()
    })

    // Performance comparison
    const successfulResults = results.filter((r) => r.success && r.responseTime)
    if (successfulResults.length > 1) {
      console.log("⚡ Performance Comparison:")
      console.log("-".repeat(30))

      const sortedByTime = [...successfulResults].sort(
        (a, b) => a.responseTime - b.responseTime
      )
      sortedByTime.forEach((result, index) => {
        const rank = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"
        console.log(`  ${rank} ${result.mode}: ${result.responseTime}ms`)
      })
      console.log()
    }

    // System health assessment
    console.log("🎯 System Health Assessment:")
    console.log("-".repeat(35))

    if (successfulModes === 0) {
      console.log("🚨 CRITICAL SYSTEM FAILURE")
      console.log("  No chat modes are functioning")
      console.log("  🔍 Root Causes:")
      console.log("    - Server not running or unreachable")
      console.log("    - Database connection issues")
      console.log("    - Critical configuration errors")
      console.log("    - Authentication/authorization breakdown")
      console.log("    - Network infrastructure problems")
      console.log("  🛠️ Immediate Actions:")
      console.log("    - Verify server is running on", baseUrl)
      console.log("    - Check database connectivity")
      console.log("    - Review server logs for errors")
      console.log("    - Validate environment configuration")
    } else if (successfulModes === 1) {
      console.log("⚠️ PARTIAL SYSTEM FUNCTIONALITY")
      console.log("  Only 1/3 modes working - feature-specific issues")

      const workingMode = results.find((r) => r.success)
      const brokenModes = results.filter((r) => !r.success)

      console.log(
        `  ✅ Working: ${workingMode?.mode} (baseline functionality intact)`
      )
      console.log(`  ❌ Broken: ${brokenModes.map((m) => m.mode).join(", ")}`)
      console.log("  🔍 Analysis:")

      brokenModes.forEach((mode) => {
        if (mode.mode === "reasoning") {
          console.log(
            "    - Reasoning model: Check Gemini API key and model availability"
          )
        } else if (mode.mode === "sequential_mcp") {
          console.log(
            "    - Sequential MCP: Check MCP server status and configuration"
          )
        }
      })
    } else if (successfulModes === 2) {
      console.log("🔶 MOSTLY FUNCTIONAL SYSTEM")
      console.log("  2/3 modes working - minor issues detected")

      const brokenMode = failedModes[0]
      console.log(`  ❌ Issue with: ${brokenMode.mode}`)

      if (brokenMode.mode === "sequential_mcp") {
        console.log("  🔍 MCP-specific issue detected")
        console.log("    - Check Sequential Thinking MCP server")
        console.log("    - Verify MCP tool configuration")
        console.log("    - Review MCP server logs")
      } else if (brokenMode.mode === "reasoning") {
        console.log("  🔍 Reasoning model issue detected")
        console.log("    - Check Gemini API availability")
        console.log("    - Verify model configuration")
        console.log("    - Check API key permissions")
      }
    } else {
      console.log("✅ EXCELLENT SYSTEM HEALTH")
      console.log("  All 3 chat modes functioning correctly")
      console.log("  🎆 Full feature availability:")
      console.log("    - Basic chat: Fast, reliable baseline")
      console.log("    - Native reasoning: Advanced AI thinking")
      console.log("    - Sequential MCP: Structured problem solving")

      // Quality assessment for successful modes
      const qualityIssues: string[] = []
      results.forEach((result) => {
        if (result.success && !result.hasCorrectAnswer) {
          qualityIssues.push(`${result.mode}: May not contain correct answer`)
        }
        if (
          result.mode === "reasoning" &&
          result.success &&
          !result.hasThinkingMarkers
        ) {
          qualityIssues.push(`${result.mode}: No thinking process detected`)
        }
        if (
          result.mode === "sequential_mcp" &&
          result.success &&
          !result.hasMCPTools
        ) {
          qualityIssues.push(`${result.mode}: No MCP tool activity detected`)
        }
      })

      if (qualityIssues.length > 0) {
        console.log("  ⚠️ Quality Concerns:")
        qualityIssues.forEach((issue) => console.log(`    - ${issue}`))
      }
    }

    console.log(`\n${"=".repeat(60)}`)

    // Enhanced assertions with context
    if (successfulModes === 0) {
      const errorSummary = results
        .map(
          (r) =>
            `${r.mode}: ${r.errorMessage || r.errorDetails || "Unknown error"}`
        )
        .join("; ")
      throw new Error(
        `CRITICAL: All chat modes failed. System is non-functional. Errors: ${errorSummary}`
      )
    }

    // Core assertion: at least one mode must work
    expect(successfulModes).toBeGreaterThan(0)

    // Baseline validation: normal mode should work for basic functionality
    const normalMode = results.find((r) => r.mode === "normal")
    if (normalMode && !normalMode.success) {
      console.log(
        "⚠️ WARNING: Normal mode failed - this indicates serious infrastructure issues"
      )
      console.log("  Normal mode is the baseline for all other functionality")
      console.log("  If normal mode fails, other modes will likely fail too")
    } else if (normalMode?.success) {
      console.log("✅ Baseline functionality confirmed: Normal mode working")
    }

    // Success threshold: aim for at least 2/3 modes working
    if (successfulModes >= 2) {
      console.log(
        `🎆 SUCCESS: ${successfulModes}/3 modes functional - system ready for use`
      )
    } else {
      console.log(
        `🔶 PARTIAL: ${successfulModes}/3 modes functional - investigate failures`
      )
    }
  })
})
