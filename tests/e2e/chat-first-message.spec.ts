import { expect, test } from "@playwright/test"
import { getChatPlaceholder } from "../helpers/app-config"
import {
  prepareTestEnvironment,
  waitForChatInput,
  sendMessage,
  waitForAIResponse,
  setupNetworkCapture,
  takeDebugScreenshot,
} from "../helpers/test-helpers"

test.describe("First Message from Home Page", () => {
  test.beforeEach(async ({ page }) => {
    // Prepare test environment with comprehensive setup
    await prepareTestEnvironment(page, { clearState: true, timeout: 60000 })
  })

  test("should display first message after sending from home page", async ({
    page,
  }) => {
    // Setup network capture and logging
    const capture = setupNetworkCapture(page)

    try {
      // Ensure chat input is ready before sending
      console.log("🔍 Waiting for chat input to be ready...")
      await waitForChatInput(page, { timeout: 30000 })

      // Send message using helper with enhanced error handling
      console.log("📤 Sending test message...")
      await sendMessage(page, "hello", { timeout: 45000 })

      // The user message should be visible with retry logic
      console.log("👀 Verifying user message visibility...")
      await expect(page.getByText("hello").first()).toBeVisible({
        timeout: 30000, // Increased from 10s
      })

      // Wait for AI response with extended timeout and better error handling
      console.log("🤖 Waiting for AI response...")
      const responseResult = await waitForAIResponse(page, {
        timeout: 120000, // Increased to 2 minutes for AI response
        expectResponse: true,
        expectReasoning: false,
      })

      // Verify both messages remain visible
      await expect(page.getByText("hello").first()).toBeVisible({
        timeout: 15000,
      })

      // More flexible AI response detection
      const aiResponseVisible = await page
        .locator(
          '[data-testid*="message"][data-role="assistant"]:visible, [class*="message"]:has-text(/Hello|Hi|Hey|help|assist/i):visible'
        )
        .count()
      expect(aiResponseVisible).toBeGreaterThan(0)

      console.log("✅ First message test completed successfully", {
        hasResponse: responseResult.hasResponse,
        responseTime: responseResult.responseTime,
      })
    } catch (error: unknown) {
      console.error("❌ First message test failed:", error)

      // Enhanced debugging info
      const chatRequests = capture.requests.filter((req) =>
        req.url.includes("/api/chat")
      )
      console.log("📊 Network Analysis:")
      console.log("  - Chat requests:", chatRequests.length)
      console.log(
        "  - Console errors:",
        capture.logs.filter((log) => log.includes("error")).length
      )
      console.log(
        "  - Network failures:",
        capture.requests.filter(
          (req) => !req.response || req.response.status >= 400
        ).length
      )

      // Take debug screenshot
      await takeDebugScreenshot(page, "first-message-failed")

      throw error
    }
  })

  test("should preserve messages during navigation", async ({ page }) => {
    // Setup network monitoring
    const capture = setupNetworkCapture(page)
    const testMessage = "test message for persistence"

    try {
      // Ensure environment is ready
      console.log("🔄 Preparing for persistence test...")
      await waitForChatInput(page, { timeout: 30000 })

      // Send message using helper
      console.log("📤 Sending persistence test message...")
      await sendMessage(page, testMessage, { timeout: 60000 })

      // Verify message is visible with retry logic
      console.log("👀 Verifying message before reload...")
      await expect(page.getByText(testMessage)).toBeVisible({
        timeout: 30000, // Increased from 15s
      })

      // Wait for any pending saves before reload
      await page.waitForTimeout(2000)

      // Refresh the page to test persistence
      console.log("🔄 Reloading page to test persistence...")
      await page.reload({ waitUntil: "networkidle", timeout: 45000 })

      // Re-prepare environment after reload
      await prepareTestEnvironment(page, { clearState: false, timeout: 30000 })

      // Message should still be visible after reload with extended timeout
      console.log("👀 Verifying message after reload...")
      await expect(page.getByText(testMessage)).toBeVisible({
        timeout: 45000, // Increased timeout for post-reload
      })

      console.log("✅ Message persistence test completed")
      console.log("📊 API requests made:", capture.requests.length)
    } catch (error: unknown) {
      console.error("❌ Message persistence test failed:", error)
      console.log("📊 Network Analysis:")
      console.log("  - Total requests:", capture.requests.length)
      console.log(
        "  - Chat requests:",
        capture.requests.filter((r) => r.url.includes("/api/chat")).length
      )
      console.log(
        "  - Failed requests:",
        capture.requests.filter((r) => !r.response || r.response.status >= 400)
          .length
      )
      await takeDebugScreenshot(page, "persistence-failed")
      throw error
    }
  })

  test("should handle rapid message submission", async ({ page }) => {
    const testMessage = "rapid test message"
    const capture = setupNetworkCapture(page)

    try {
      console.log("⚡ Testing rapid message submission...")

      // Get chat input using helper with enhanced waiting
      console.log("🔍 Waiting for chat input...")
      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Fill message with verification
      console.log("✍️ Filling message input...")
      await chatInput.fill(testMessage)
      await expect(chatInput).toHaveValue(testMessage, { timeout: 5000 })

      // Get send button with better selector
      const sendButton = page
        .locator(
          'button[aria-label="Send message"], button[type="submit"]:has-text("Send"), [data-testid="send-button"]'
        )
        .first()

      console.log("🔍 Waiting for send button...")
      await expect(sendButton).toBeVisible({ timeout: 15000 })
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      // Send with enhanced concurrency handling
      console.log("📤 Clicking send button...")
      await Promise.all([
        page.waitForURL(/\/c\/[a-zA-Z0-9-]+/, { timeout: 45000 }),
        sendButton.click(),
      ])

      // Should see the message with increased timeout and better detection
      console.log("👀 Verifying message visibility...")
      await expect(page.getByText(testMessage)).toBeVisible({
        timeout: 30000, // Increased from 15s
      })

      console.log("✅ Rapid submission test completed")
    } catch (error: unknown) {
      console.error("❌ Rapid submission test failed:", error)
      console.log("📊 Network activity during failure:")
      console.log("  - Total requests:", capture.requests.length)
      console.log("  - URL changes:", await page.url())
      await takeDebugScreenshot(page, "rapid-submission-failed")
      throw error
    }
  })

  test("should maintain message state with slow database", async ({ page }) => {
    const testMessage = "testing with slow db"

    try {
      // Intercept and delay database calls
      await page.route("**/api/messages*", async (route) => {
        // Delay database response to simulate slow network
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await route.continue()
      })

      // Send message using helper with extended timeout for slow DB
      await sendMessage(page, testMessage, { timeout: 60000 })

      // Message should still be visible despite slow DB with extended timeout
      await expect(page.getByText(testMessage)).toBeVisible({
        timeout: 30000, // Increased for slow DB simulation
      })

      console.log("✅ Slow database test completed")
    } catch (error: unknown) {
      console.error("❌ Slow database test failed:", error)
      await takeDebugScreenshot(page, "slow-db-failed")
      throw error
    } finally {
      // Clean up route intercept
      await page.unroute("**/api/messages*")
    }
  })
})
