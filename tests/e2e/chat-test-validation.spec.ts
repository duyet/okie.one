import { expect, test } from "@playwright/test"

import {
  prepareTestEnvironment,
  setupMockAIResponse,
  waitForChatInput,
  waitForSendButton,
} from "../helpers/test-helpers"

/**
 * Chat Test Validation
 *
 * Quick validation tests to verify our test infrastructure works correctly
 */

test.describe("Chat Test Infrastructure Validation", () => {
  test("should verify basic test infrastructure", async ({ page }) => {
    console.log("🔧 Validating test infrastructure...")

    try {
      // Test environment setup
      await prepareTestEnvironment(page, {
        clearState: true,
        timeout: 30000,
        enableMockResponses: true,
      })

      // Test basic page elements are available
      const chatInput = await waitForChatInput(page, { timeout: 10000 })
      await expect(chatInput).toBeVisible()
      console.log("✅ Chat input found and visible")

      const sendButton = await waitForSendButton(page, {
        timeout: 10000,
        waitForEnabled: false,
      })
      await expect(sendButton).toBeVisible()
      console.log("✅ Send button found and visible")

      // Test mock response setup
      await setupMockAIResponse(
        page,
        "Test infrastructure validation successful"
      )
      console.log("✅ Mock AI response setup successful")

      // Test input interaction
      await chatInput.fill("Infrastructure test")
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe("Infrastructure test")
      console.log("✅ Input interaction working")

      console.log("✅ Test infrastructure validation completed successfully")
    } catch (error) {
      console.error("❌ Test infrastructure validation failed:", error)
      throw error
    }
  })

  test("should verify accessibility attributes", async ({ page }) => {
    console.log("♿ Validating accessibility attributes...")

    try {
      await prepareTestEnvironment(page, {
        clearState: true,
        timeout: 30000,
        enableMockResponses: true,
      })

      const chatInput = await waitForChatInput(page, { timeout: 10000 })
      const sendButton = await waitForSendButton(page, {
        timeout: 10000,
        waitForEnabled: false,
      })

      // Check basic ARIA attributes
      const inputPlaceholder = await chatInput.getAttribute("placeholder")
      const buttonAriaLabel = await sendButton.getAttribute("aria-label")

      console.log(`Input placeholder: "${inputPlaceholder}"`)
      console.log(`Button aria-label: "${buttonAriaLabel}"`)

      // At least one should have proper labeling
      const hasAccessibilityLabels =
        (inputPlaceholder && inputPlaceholder.trim().length > 0) ||
        (buttonAriaLabel && buttonAriaLabel.trim().length > 0)

      expect(hasAccessibilityLabels).toBe(true)
      console.log("✅ Basic accessibility attributes present")
    } catch (error) {
      console.error("❌ Accessibility validation failed:", error)
      throw error
    }
  })

  test("should verify error handling capability", async ({ page }) => {
    console.log("🚨 Validating error handling capability...")

    try {
      await prepareTestEnvironment(page, {
        clearState: true,
        timeout: 30000,
        enableMockResponses: false, // Don't mock to test error handling
      })

      // Simulate an API error
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 500,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            error: "Test error",
            message: "This is a test error",
          }),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 10000 })
      const sendButton = await waitForSendButton(page, {
        timeout: 10000,
        waitForEnabled: false,
      })

      await chatInput.fill("Error test message")
      await sendButton.click()

      // Wait for error processing
      await page.waitForTimeout(3000)

      // Verify button becomes available again (error recovery)
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      // Verify input is cleared (current behavior after AI SDK v5 migration)
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe("")

      // Verify no navigation occurred
      expect(page.url()).not.toMatch(/\/c\/[a-f0-9-]+/)

      console.log("✅ Error handling capability validated")
    } catch (error) {
      console.error("❌ Error handling validation failed:", error)
      throw error
    }
  })
})
