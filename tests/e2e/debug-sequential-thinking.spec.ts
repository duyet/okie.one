import { expect, test } from "@playwright/test"

import {
  prepareTestEnvironment,
  setupSequentialThinkingTest,
  takeDebugScreenshot,
} from "../helpers/test-helpers"

// Type definitions for test data
// ToolConfig and ChatRequestData interfaces are defined inline where used

/**
 * Comprehensive E2E test to debug Sequential Thinking MCP issues
 * Using enhanced test helpers for better reliability and debugging
 */
test.describe("Debug Sequential Thinking MCP", () => {
  test.beforeEach(async ({ page }) => {
    // Prepare comprehensive test environment
    await prepareTestEnvironment(page, { clearState: true, timeout: 60000 })
  })

  test("should debug Sequential Thinking MCP end-to-end flow", async ({
    page,
  }) => {
    console.log("🧪 Starting enhanced Sequential Thinking MCP debug test...")

    try {
      // Use comprehensive test setup helper with enhanced error handling
      console.log("🔧 Setting up Sequential Thinking test environment...")
      const capture = await setupSequentialThinkingTest(page, {
        message:
          "What is 25% of 80? Use sequential thinking to break this down step by step.",
        timeout: 240000, // Increased to 4 minutes for comprehensive debugging
        expectResponse: true,
        expectReasoning: true,
      })

      console.log("✅ Sequential Thinking test setup completed")

      // Enhanced network analysis with better error categorization
      console.log("\n📊 Network Analysis:")
      const chatRequests = capture.requests.filter((req) =>
        req.url.includes("/api/chat")
      )
      console.log("🌐 Chat API requests:", chatRequests.length)

      // Analyze request/response patterns
      let successfulRequests = 0
      let serverErrors = 0
      let clientErrors = 0

      // Analyze each chat request with enhanced debugging
      for (const [index, request] of chatRequests.entries()) {
        console.log(`\n📤 Chat Request ${index + 1}:`)
        console.log("  Method:", request.method)
        console.log("  URL:", request.url)
        console.log(
          "  Timestamp:",
          new Date(request.timestamp || Date.now()).toISOString()
        )

        if (request.postData) {
          console.log("  🔧 Configuration:")
          console.log("    Model:", request.postData.model)
          console.log("    Thinking Mode:", request.postData.thinkingMode)
          console.log("    Enable Think:", request.postData.enableThink)
          console.log("    Messages Count:", request.postData.messages?.length)
          console.log(
            "    User ID:",
            `${request.postData.userId?.substring(0, 8)}...`
          )
          console.log("    Is Authenticated:", request.postData.isAuthenticated)

          if (request.postData.tools) {
            console.log("    🔧 Tools configured:")
            request.postData.tools.forEach(
              (tool: Record<string, unknown>, i: number) => {
                const toolType = tool.type as string
                const toolName =
                  toolType === "mcp" ? (tool.name as string) : toolType
                console.log(`      ${i + 1}: ${toolType} - ${toolName}`)
              }
            )
          } else {
            console.log("    ⚠️ No tools configured")
          }
        }

        if (request.response) {
          console.log("  📝 Response:")
          console.log("    Status:", request.response.status)

          if (request.response?.status === 200) {
            successfulRequests++
            console.log(
              "    Content-Type:",
              request.response.headers?.["content-type"] || "unknown"
            )
            console.log(
              "    Response Length:",
              request.response.body?.length || 0
            )
            console.log(
              "    Preview:",
              `${request.response.body?.substring(0, 150)}...`
            )

            // Enhanced MCP tool detection
            const hasMCPTools = [
              "sequentialthinking",
              "tool_call",
              "function_call",
              "mcp__sequential-thinking",
              "addReasoningStep",
              "thoughtNumber",
              "nextThoughtNeeded",
            ].some((pattern) => request.response?.body?.includes(pattern))

            console.log("    🧠 MCP Tool Activity:", hasMCPTools)

            if (hasMCPTools) {
              console.log("    ✅ Sequential Thinking patterns detected")
            }
          } else if (request.response?.status >= 500) {
            serverErrors++
            console.log(
              "    🚨 Server Error Body:",
              request.response?.body?.substring(0, 300)
            )
          } else if (request.response?.status >= 400) {
            clientErrors++
            console.log(
              "    ⚠️ Client Error Body:",
              request.response?.body?.substring(0, 300)
            )
          }
        } else {
          console.log("    ❌ No response received (timeout or network error)")
        }
      }

      // Enhanced console log analysis
      console.log("\n📊 Console Log Analysis:")
      const mcpPatterns = [
        "MCP",
        "sequentialthinking",
        "addReasoningStep",
        "🧠",
        "🔧",
        "tool_call",
        "function_call",
        "mcp__sequential-thinking",
        "thoughtNumber",
        "nextThoughtNeeded",
      ]

      const mcpLogs = capture.logs.filter((log) =>
        mcpPatterns.some((pattern) =>
          log.toLowerCase().includes(pattern.toLowerCase())
        )
      )

      console.log("🧠 MCP-related logs found:", mcpLogs.length)
      if (mcpLogs.length > 0) {
        console.log("  Recent MCP logs:")
        mcpLogs.slice(-5).forEach((log, i) => {
          console.log(
            `    ${i + 1}: ${log.substring(0, 100)}${log.length > 100 ? "..." : ""}`
          )
        })
      }

      const errorLogs = capture.logs.filter(
        (log) =>
          log.toLowerCase().includes("error") ||
          log.toLowerCase().includes("failed")
      )
      console.log("❌ Error logs:", errorLogs.length)
      if (errorLogs.length > 0) {
        console.log("  Recent errors:")
        errorLogs.slice(-3).forEach((log, i) => {
          console.log(`    ${i + 1}: ${log}`)
        })
      }

      // Enhanced UI verification
      console.log("\n🔍 UI State Analysis:")

      // Multiple selector patterns for reasoning steps
      const reasoningSelectors = [
        '[data-testid*="reasoning"]',
        '[class*="reasoning"]',
        '[data-testid="reasoning-steps"]',
        ".reasoning-step",
        '[data-testid="sequential-thinking"]',
        ".mcp-reasoning",
        '[class*="step"]:has-text("Step")',
        '[class*="thinking"]:has-text("thinking")',
      ]

      let totalReasoningElements = 0
      for (const selector of reasoningSelectors) {
        const count = await page.locator(selector).count()
        if (count > 0) {
          console.log(`  🧠 Found ${count} elements with selector: ${selector}`)
          totalReasoningElements += count
        }
      }

      console.log(`  🧠 Total reasoning elements: ${totalReasoningElements}`)

      // Check for error indicators
      const errorSelectors = [
        '[role="alert"]',
        ".error",
        '[class*="error"]',
        '[data-testid*="error"]',
        ".toast-error",
        '[class*="alert"][class*="error"]',
      ]

      let totalErrorElements = 0
      for (const selector of errorSelectors) {
        const count = await page.locator(selector).count()
        if (count > 0) {
          console.log(
            `  ❌ Found ${count} error elements with selector: ${selector}`
          )
          totalErrorElements += count

          // Log error text for debugging
          const elements = page.locator(selector)
          for (let i = 0; i < Math.min(count, 2); i++) {
            const errorText = await elements.nth(i).textContent()
            console.log(`    Error ${i + 1}: ${errorText?.substring(0, 100)}`)
          }
        }
      }

      console.log(`  ❌ Total error elements: ${totalErrorElements}`)

      // Comprehensive results analysis
      const hasSuccessfulResponse = successfulRequests > 0
      const hasSequentialThinking = chatRequests.some(
        (req) =>
          req.postData?.thinkingMode === "sequential" ||
          req.postData?.tools?.some(
            (tool: Record<string, unknown>) =>
              tool.type === "mcp" && tool.name === "server-sequential-thinking"
          )
      )
      const hasMCPActivity = mcpLogs.length > 0
      const hasUIReasoningSteps = totalReasoningElements > 0

      console.log("\n🎯 Comprehensive Results Summary:")
      console.log(
        `  ✅ Successful API responses: ${successfulRequests}/${chatRequests.length}`
      )
      console.log(`  🚨 Server errors: ${serverErrors}`)
      console.log(`  ⚠️ Client errors: ${clientErrors}`)
      console.log("  🔧 Sequential Thinking configured:", hasSequentialThinking)
      console.log("  🧠 MCP activity in logs:", hasMCPActivity)
      console.log("  🎨 UI reasoning steps:", hasUIReasoningSteps)
      console.log("  📊 Total reasoning elements:", totalReasoningElements)
      console.log("  ❌ UI error indicators:", totalErrorElements)

      // Enhanced screenshot for debugging
      await takeDebugScreenshot(page, "sequential-thinking-comprehensive-debug")

      // Progressive assertions with detailed diagnostics
      console.log("\n🔍 Running Diagnostic Assertions:")

      // 1. Basic connectivity
      if (!hasSuccessfulResponse) {
        console.log("❌ DIAGNOSTIC 1 FAILED: No successful API responses")
        console.log("  Issue: Basic API connectivity problem")
        console.log("  Possible causes:")
        console.log("    - Server not running")
        console.log("    - Network connectivity issues")
        console.log("    - Authentication problems")

        chatRequests.forEach((req, i) => {
          if (req.response?.status !== 200) {
            console.log(
              `    Request ${i + 1}: ${req.response?.status || "NO_RESPONSE"} - ${req.response?.body?.substring(0, 100) || "No body"}`
            )
          }
        })

        expect(hasSuccessfulResponse).toBe(true)
      } else {
        console.log("✅ DIAGNOSTIC 1 PASSED: API connectivity working")
      }

      // 2. Sequential Thinking configuration
      if (!hasSequentialThinking) {
        console.log(
          "❌ DIAGNOSTIC 2 FAILED: Sequential Thinking not configured"
        )
        console.log("  Issue: MCP tool configuration problem")
        console.log(
          "  Expected: thinkingMode='sequential' and MCP tools configured"
        )

        chatRequests.forEach((req, i) => {
          console.log(`    Request ${i + 1}:`)
          console.log(
            `      Thinking Mode: ${req.postData?.thinkingMode || "NOT_SET"}`
          )
          console.log(`      Tool Count: ${req.postData?.tools?.length || 0}`)
          if (req.postData?.tools) {
            req.postData.tools.forEach(
              (tool: Record<string, unknown>, j: number) => {
                const toolType = tool.type as string
                const toolName =
                  toolType === "mcp" ? (tool.name as string) : toolType
                console.log(`        Tool ${j + 1}: ${toolType} - ${toolName}`)
              }
            )
          }
        })

        expect(hasSequentialThinking).toBe(true)
      } else {
        console.log(
          "✅ DIAGNOSTIC 2 PASSED: Sequential Thinking properly configured"
        )
      }

      // 3. MCP Activity Detection (informational)
      if (!hasMCPActivity && !hasUIReasoningSteps) {
        console.log("⚠️ DIAGNOSTIC 3 WARNING: Limited MCP evidence detected")
        console.log("  This could indicate:")
        console.log("    1. MCP server not responding to tool calls")
        console.log("    2. AI model not invoking Sequential Thinking tools")
        console.log("    3. Tool responses not being logged properly")
        console.log("    4. UI not rendering reasoning steps")
        console.log("    5. Different response format than expected")

        console.log("  🔍 Manual investigation recommended")
        console.log("  📊 Check MCP server logs and model behavior")

        // Don't fail the test - this is diagnostic information
        console.log("  ℹ️ Test continues - this is investigational data")
      } else {
        console.log(
          "✅ DIAGNOSTIC 3 PASSED: MCP activity or UI reasoning detected"
        )
        console.log(
          "  ✅ Sequential Thinking MCP appears to be working correctly"
        )
      }
    } catch (error: unknown) {
      console.error("❌ Sequential Thinking debug test failed:", error)
      console.log("📊 Error Context:")
      console.log(
        "  - Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      )
      console.log(
        "  - Error message:",
        error instanceof Error ? error.message : String(error)
      )
      console.log(
        "  - Stack trace:",
        error instanceof Error
          ? error.stack?.split("\n").slice(0, 3).join("\n")
          : "No stack trace available"
      )

      await takeDebugScreenshot(page, "debug-test-failed")
      throw error
    }
  })

  test.afterEach(async ({ page: _page }) => {
    console.log("\n📊 Debug session completed")
    console.log("📅 Timestamp:", new Date().toISOString())

    // Additional cleanup or logging can be added here
    // The helpers automatically handle most cleanup
  })
})
