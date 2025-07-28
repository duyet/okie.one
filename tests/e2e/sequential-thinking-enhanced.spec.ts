import { expect, test } from "@playwright/test"
import {
  clearBrowserState,
  setupSequentialThinking,
  sendMessage,
  waitForAIResponse,
  waitForPageReady,
  takeDebugScreenshot,
  setupNetworkCapture,
} from "../helpers/test-helpers"

/**
 * Enhanced Sequential Thinking MCP test using new helper functions
 * Demonstrates the improved test patterns with proper timeout handling
 */
test.describe("Sequential Thinking MCP - Enhanced", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear state for clean test environment
    await clearBrowserState(page)
    await context.clearCookies()
  })

  test("should successfully process math question with Sequential Thinking MCP", async ({
    page,
  }) => {
    console.log("🧪 Starting Enhanced Sequential Thinking MCP test...")

    try {
      // Setup network capture for debugging
      const capture = setupNetworkCapture(page)

      // Navigate and wait for page readiness
      await page.goto("/")
      await waitForPageReady(page, { timeout: 45000 })

      // Setup Sequential Thinking MCP
      await setupSequentialThinking(page, {
        enable: true,
        timeout: 20000,
      })

      // Send a math question that should trigger step-by-step reasoning
      const testQuestion =
        "What is 15% of 240? Please break this down step by step."
      await sendMessage(page, testQuestion, { timeout: 45000 })

      // Wait for AI response with extended timeout for MCP processing
      await waitForAIResponse(page, {
        timeout: 120000, // 2 minutes for MCP reasoning
        expectResponse: true,
        expectReasoning: true,
      })

      // Verify the response contains mathematical reasoning
      const messageContent = page.locator('[data-testid="message"]').first()
      await expect(messageContent).toBeVisible()

      const responseText = await messageContent.textContent()
      console.log(
        "📝 Response preview:",
        responseText?.substring(0, 300) + "..."
      )

      // Look for mathematical calculation indicators
      const hasCalculation =
        responseText?.includes("15%") ||
        responseText?.includes("240") ||
        responseText?.includes("36") // Expected answer

      if (hasCalculation) {
        console.log("✅ Response contains expected mathematical content")
      } else {
        console.log(
          "⚠️ Response may not contain expected mathematical reasoning"
        )
      }

      // Check for Sequential Thinking MCP activity in network requests
      const mcpRequests = capture.requests.filter(
        (req) =>
          req.postData?.thinkingMode === "sequential" ||
          req.postData?.tools?.some(
            (tool: any) =>
              tool.type === "mcp" && tool.name === "server-sequential-thinking"
          )
      )

      console.log(`🔧 MCP requests found: ${mcpRequests.length}`)

      if (mcpRequests.length > 0) {
        console.log("✅ Sequential Thinking MCP was properly invoked")

        mcpRequests.forEach((req, index) => {
          console.log(`  Request ${index + 1}:`, {
            thinkingMode: req.postData?.thinkingMode,
            toolsCount: req.postData?.tools?.length || 0,
            status: req.response?.status || "pending",
          })
        })
      } else {
        console.log("⚠️ No Sequential Thinking MCP requests detected")
      }

      // Assertions
      expect(hasCalculation).toBe(true)
      expect(mcpRequests.length).toBeGreaterThan(0)

      console.log(
        "✅ Enhanced Sequential Thinking MCP test completed successfully"
      )
    } catch (error: unknown) {
      console.error("❌ Enhanced Sequential Thinking MCP test failed:", error)
      await takeDebugScreenshot(page, "enhanced-sequential-thinking-failed")
      throw error
    }
  })

  test("should handle Sequential Thinking toggle states correctly", async ({
    page,
  }) => {
    console.log("🧪 Testing Sequential Thinking toggle functionality...")

    try {
      await page.goto("/")
      await waitForPageReady(page, { timeout: 30000 })

      // Test enabling Sequential Thinking
      await setupSequentialThinking(page, { enable: true, timeout: 15000 })

      // Verify button is active
      const thinkButton = page.locator('[data-testid="think-button"]')
      const activeClasses = await thinkButton.getAttribute("class")
      expect(activeClasses).toContain("bg-[#E5F3FE]")

      // Test disabling Sequential Thinking
      await setupSequentialThinking(page, { enable: false, timeout: 15000 })

      // Verify button is inactive
      const inactiveClasses = await thinkButton.getAttribute("class")
      expect(inactiveClasses).not.toContain("bg-[#E5F3FE]")

      console.log("✅ Sequential Thinking toggle test completed successfully")
    } catch (error: unknown) {
      console.error("❌ Sequential Thinking toggle test failed:", error)
      await takeDebugScreenshot(page, "toggle-test-failed")
      throw error
    }
  })

  test("should handle timeout scenarios gracefully", async ({ page }) => {
    console.log("🧪 Testing timeout handling...")

    try {
      await page.goto("/")
      await waitForPageReady(page, { timeout: 30000 })

      // Setup Sequential Thinking with shorter timeout for this test
      await setupSequentialThinking(page, { enable: true, timeout: 10000 })

      // Send a simple question
      await sendMessage(page, "What is 2 + 2?", { timeout: 30000 })

      // Wait for response with reasonable timeout
      await waitForAIResponse(page, {
        timeout: 60000, // 1 minute should be sufficient for simple math
        expectResponse: true,
        expectReasoning: false, // Simple questions may not need reasoning
      })

      console.log("✅ Timeout handling test completed successfully")
    } catch (error: unknown) {
      console.error("❌ Timeout handling test failed:", error)

      // Take screenshot for debugging but don't fail the test
      // Timeout issues might be environmental
      await takeDebugScreenshot(page, "timeout-test-failed")

      // Log the error but allow test to continue
      console.log("⚠️ Test failed due to timeout, this may be environmental")
      throw error
    }
  })
})
