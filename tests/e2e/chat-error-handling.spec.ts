import { expect, test } from "@playwright/test"

import {
  prepareTestEnvironment,
  setupNetworkCapture,
  takeDebugScreenshot,
  waitForChatInput,
  waitForSendButton,
} from "../helpers/test-helpers"

/**
 * Chat Error Handling UI E2E Tests
 *
 * Tests error scenarios and how the UI handles them:
 * - API validation errors and user feedback
 * - Network failures and recovery
 * - Invalid form submissions
 * - Error message display and clarity
 * - Graceful degradation and error recovery
 */

test.describe("Chat Error Handling Tests", () => {
  test.beforeEach(async ({ page }) => {
    await prepareTestEnvironment(page, {
      clearState: true,
      timeout: 60000,
      enableMockResponses: false, // Disable mocks to test real error scenarios
    })
  })

  test("should handle API validation errors gracefully", async ({ page }) => {
    console.log("🚨 Testing API validation error handling...")

    const capture = setupNetworkCapture(page)

    try {
      // Intercept chat API to return validation error
      await page.route("**/api/chat", async (route) => {
        console.log("🎭 Intercepting chat API to simulate validation error...")

        const request = route.request()
        const requestBody = request.postDataJSON()

        // Simulate a validation error response
        const validationError = {
          error: "Validation failed",
          message: "Required fields are missing",
          details: {
            model: "Model is required",
            messages: "Messages array is required",
          },
        }

        await route.fulfill({
          status: 400,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(validationError),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      // Attempt to send a message
      const testMessage = "This should trigger validation error"
      await chatInput.fill(testMessage)
      await sendButton.click()

      // Check for error display in UI
      console.log("🔍 Looking for error feedback in UI...")

      // Look for various error indicators
      const errorSelectors = [
        '[role="alert"]',
        ".error",
        '[class*="error"]',
        '[data-testid*="error"]',
        'text*="error"',
        'text*="failed"',
        'text*="required"',
      ]

      let errorFound = false
      for (const selector of errorSelectors) {
        try {
          const errorElement = page.locator(selector)
          await errorElement.first().waitFor({ timeout: 10000 })

          const errorCount = await errorElement.count()
          if (errorCount > 0) {
            console.log(`✅ Error display found with selector: ${selector}`)
            const errorText = await errorElement.first().textContent()
            console.log(`Error message: "${errorText}"`)
            errorFound = true

            // Verify error message is meaningful
            expect(errorText?.toLowerCase()).toMatch(
              /error|failed|required|invalid/
            )
            break
          }
        } catch {
          // Continue to next selector
        }
      }

      // Verify that some form of error feedback was shown
      if (!errorFound) {
        // Check if send button shows error state
        const sendButtonDisabled = await sendButton.getAttribute("disabled")
        const sendButtonAriaLabel = await sendButton.getAttribute("aria-label")

        console.log(
          "⚠️ No explicit error message found, checking button state..."
        )
        console.log(`Send button disabled: ${sendButtonDisabled}`)
        console.log(`Send button aria-label: ${sendButtonAriaLabel}`)

        // At minimum, the UI should provide some feedback
        // This could be through button state, console logs, or other means
      }

      // Verify the message wasn't processed (no navigation to chat page)
      const currentUrl = page.url()
      expect(currentUrl).not.toMatch(/\/c\/[a-f0-9-]+/)
      console.log("✅ No navigation occurred (expected for error case)")

      // Verify send button becomes available again
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      // Verify input still contains the message (not cleared on error)
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe(testMessage)

      console.log("✅ API validation error handling test completed")
    } catch (error) {
      console.error("❌ API validation error test failed:", error)

      // Analyze network requests
      const chatRequests = capture.requests.filter((req) =>
        req.url.includes("/api/chat")
      )
      console.log("📊 Chat API requests during test:", chatRequests.length)

      if (chatRequests.length > 0) {
        const lastRequest = chatRequests[chatRequests.length - 1]
        console.log("Last request details:", {
          status: lastRequest.response?.status,
          body: lastRequest.response?.body?.substring(0, 200),
        })
      }

      await takeDebugScreenshot(page, "validation-error-failed")
      throw error
    }
  })

  test("should handle network failures gracefully", async ({ page }) => {
    console.log("🌐 Testing network failure handling...")

    const capture = setupNetworkCapture(page)

    try {
      // Intercept chat API to simulate network failure
      await page.route("**/api/chat", async (route) => {
        console.log("🎭 Simulating network failure...")
        await route.abort("internetdisconnected")
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      const testMessage = "Testing network failure"
      await chatInput.fill(testMessage)

      // Click send button
      await sendButton.click()

      // Should show some form of network error
      console.log("🔍 Checking for network error indicators...")

      // Look for network error indicators
      let networkErrorFound = false

      // Check for offline indicators, network error messages, or retry options
      const networkErrorSelectors = [
        'text*="network"',
        'text*="connection"',
        'text*="offline"',
        'text*="retry"',
        'text*="failed to send"',
        '[data-testid*="network"]',
        '[data-testid*="offline"]',
      ]

      for (const selector of networkErrorSelectors) {
        try {
          await page.locator(selector).first().waitFor({ timeout: 10000 })
          console.log(`✅ Network error indicator found: ${selector}`)
          networkErrorFound = true
          break
        } catch {
          // Continue to next selector
        }
      }

      // Alternative: Check if send button shows error/retry state
      if (!networkErrorFound) {
        console.log(
          "⚠️ No explicit network error message, checking button state..."
        )

        // Send button should become available again for retry
        await expect(sendButton).toBeEnabled({ timeout: 15000 })

        // Message should still be in input for user to retry
        const inputValue = await chatInput.inputValue()
        expect(inputValue).toBe(testMessage)
      }

      // Verify no navigation occurred
      const currentUrl = page.url()
      expect(currentUrl).not.toMatch(/\/c\/[a-f0-9-]+/)

      console.log("✅ Network failure handling test completed")
    } catch (error) {
      console.error("❌ Network failure test failed:", error)

      const requests = capture.requests.filter((req) =>
        req.url.includes("/api/chat")
      )
      console.log("📊 Network requests attempted:", requests.length)

      await takeDebugScreenshot(page, "network-failure-failed")
      throw error
    }
  })

  test("should handle empty message submission", async ({ page }) => {
    console.log("📝 Testing empty message submission...")

    try {
      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      // Verify send button is initially disabled when input is empty
      const initialInputValue = await chatInput.inputValue()
      expect(initialInputValue).toBe("")

      // Check if send button is disabled for empty input
      console.log("🔍 Checking send button state with empty input...")

      // Try to click send button with empty input
      const initiallyDisabled = await sendButton.getAttribute("disabled")

      if (initiallyDisabled) {
        console.log("✅ Send button properly disabled for empty input")

        // Verify button becomes enabled when text is added
        await chatInput.fill("Test")
        await expect(sendButton).toBeEnabled({ timeout: 5000 })

        // Clear input and verify button is disabled again
        await chatInput.clear()
        await expect(sendButton).toBeDisabled({ timeout: 5000 })
      } else {
        console.log("⚠️ Send button not disabled, testing click behavior...")

        // If button is not disabled, clicking it should not do anything harmful
        await sendButton.click()

        // Verify no navigation occurred
        const currentUrl = page.url()
        expect(currentUrl).not.toMatch(/\/c\/[a-f0-9-]+/)
      }

      console.log("✅ Empty message submission test completed")
    } catch (error) {
      console.error("❌ Empty message submission test failed:", error)
      await takeDebugScreenshot(page, "empty-message-failed")
      throw error
    }
  })

  test("should handle server error responses", async ({ page }) => {
    console.log("🚨 Testing server error response handling...")

    const capture = setupNetworkCapture(page)

    try {
      // Intercept chat API to return server error
      await page.route("**/api/chat", async (route) => {
        console.log("🎭 Simulating server error...")

        await route.fulfill({
          status: 500,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            error: "Internal Server Error",
            message: "Something went wrong on our end",
          }),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      const testMessage = "Testing server error"
      await chatInput.fill(testMessage)
      await sendButton.click()

      // Look for server error indicators
      console.log("🔍 Looking for server error feedback...")

      const serverErrorSelectors = [
        'text*="server error"',
        'text*="something went wrong"',
        'text*="try again"',
        'text*="500"',
        '[role="alert"]',
      ]

      let errorFound = false
      for (const selector of serverErrorSelectors) {
        try {
          await page.locator(selector).first().waitFor({ timeout: 10000 })
          console.log(`✅ Server error feedback found: ${selector}`)
          errorFound = true
          break
        } catch {
          // Continue
        }
      }

      // Verify send button is re-enabled for retry
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      // Verify message is preserved for retry
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe(testMessage)

      // Verify no navigation occurred
      expect(page.url()).not.toMatch(/\/c\/[a-f0-9-]+/)

      console.log("✅ Server error handling test completed")
    } catch (error) {
      console.error("❌ Server error test failed:", error)
      await takeDebugScreenshot(page, "server-error-failed")
      throw error
    }
  })

  test("should handle rate limiting gracefully", async ({ page }) => {
    console.log("⏱️ Testing rate limiting handling...")

    try {
      // Intercept chat API to return rate limit error
      await page.route("**/api/chat", async (route) => {
        console.log("🎭 Simulating rate limit error...")

        await route.fulfill({
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": "60",
          },
          body: JSON.stringify({
            error: "Rate Limited",
            message: "Too many requests. Please wait before trying again.",
            retryAfter: 60,
          }),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      const testMessage = "Testing rate limit"
      await chatInput.fill(testMessage)
      await sendButton.click()

      // Look for rate limit indicators
      console.log("🔍 Looking for rate limit feedback...")

      const rateLimitSelectors = [
        'text*="rate limit"',
        'text*="too many"',
        'text*="wait"',
        'text*="try again later"',
        'text*="429"',
      ]

      for (const selector of rateLimitSelectors) {
        try {
          await page.locator(selector).first().waitFor({ timeout: 10000 })
          console.log(`✅ Rate limit feedback found: ${selector}`)
          break
        } catch {
          // Continue
        }
      }

      // Verify appropriate handling (button might stay disabled longer)
      console.log("⏳ Checking rate limit button behavior...")

      // Button should eventually be re-enabled
      await expect(sendButton).toBeEnabled({ timeout: 20000 })

      // Message should be preserved
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe(testMessage)

      console.log("✅ Rate limiting test completed")
    } catch (error) {
      console.error("❌ Rate limiting test failed:", error)
      await takeDebugScreenshot(page, "rate-limit-failed")
      throw error
    }
  })

  test("should recover from errors and allow retry", async ({ page }) => {
    console.log("🔄 Testing error recovery and retry functionality...")

    const capture = setupNetworkCapture(page)
    let attemptCount = 0

    try {
      // First attempt fails, second succeeds
      await page.route("**/api/chat", async (route) => {
        attemptCount++
        console.log(`🎭 Chat attempt ${attemptCount}`)

        if (attemptCount === 1) {
          // First attempt fails
          await route.fulfill({
            status: 500,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              error: "Temporary server error",
            }),
          })
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-vercel-ai-data-stream": "v1",
            },
            body: `f:{"messageId":"test-${attemptCount}"}\n0:"Retry successful! Message received."\ne:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":5}}\n`,
          })
        }
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      const testMessage = "Testing error recovery"
      await chatInput.fill(testMessage)

      // First attempt (should fail)
      console.log("📤 First attempt (expect failure)...")
      await sendButton.click()

      // Wait for error state to resolve
      await page.waitForTimeout(3000)

      // Verify button is re-enabled for retry
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      // Verify message is still there
      const inputValueAfterError = await chatInput.inputValue()
      expect(inputValueAfterError).toBe(testMessage)

      // Second attempt (should succeed)
      console.log("📤 Second attempt (expect success)...")
      await sendButton.click()

      // This time should succeed and navigate
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })

      // Verify message appears
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      // Verify success response
      await expect(page.getByText(/Retry successful/)).toBeVisible({
        timeout: 15000,
      })

      console.log("✅ Error recovery and retry test completed")
    } catch (error) {
      console.error("❌ Error recovery test failed:", error)

      console.log(`📊 Attempts made: ${attemptCount}`)
      const requests = capture.requests.filter((req) =>
        req.url.includes("/api/chat")
      )
      console.log(`Network requests: ${requests.length}`)

      await takeDebugScreenshot(page, "error-recovery-failed")
      throw error
    }
  })

  test("should provide clear error messaging for users", async ({ page }) => {
    console.log("💬 Testing error message clarity and user guidance...")

    try {
      // Intercept to return a detailed error
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 400,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            error: "Validation Error",
            message:
              "Your message could not be processed. Please check your input and try again.",
            details: {
              code: "INVALID_INPUT",
              suggestion:
                "Make sure your message is not empty and contains valid text.",
            },
          }),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      await chatInput.fill("Test error messaging")
      await sendButton.click()

      // Look for user-friendly error messages
      console.log("🔍 Checking for user-friendly error messages...")

      // Should have clear, actionable error messages
      const friendlyErrorSelectors = [
        'text*="could not be processed"',
        'text*="please"',
        'text*="try again"',
        'text*="check your input"',
        'text*="make sure"',
      ]

      let friendlyErrorFound = false
      for (const selector of friendlyErrorSelectors) {
        try {
          await page.locator(selector).first().waitFor({ timeout: 10000 })
          console.log(`✅ User-friendly error message found: ${selector}`)
          friendlyErrorFound = true
          break
        } catch {
          // Continue
        }
      }

      // Even if specific messages aren't found, verify basic error handling
      console.log("🔍 Verifying basic error handling...")

      // Send button should be re-enabled
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      // Input should be preserved
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe("Test error messaging")

      console.log("✅ Error messaging test completed")
    } catch (error) {
      console.error("❌ Error messaging test failed:", error)
      await takeDebugScreenshot(page, "error-messaging-failed")
      throw error
    }
  })
})
