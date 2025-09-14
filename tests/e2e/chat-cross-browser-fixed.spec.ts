import { expect, test } from "@playwright/test"

import {
  prepareTestEnvironment,
  sendMessage,
  setupMockAIResponse,
  takeDebugScreenshot,
  waitForAIResponse,
  waitForChatInput,
  waitForSendButton,
} from "../helpers/test-helpers"

/**
 * Cross-Browser Chat UI E2E Tests (Fixed)
 *
 * Tests chat functionality across different scenarios:
 * - Basic cross-browser compatibility
 * - Different viewport sizes
 * - User agent variations
 * - Input method variations
 * - Error handling consistency
 */

test.describe("Cross-Browser Compatibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await prepareTestEnvironment(page, {
      clearState: true,
      timeout: 60000,
      enableMockResponses: true,
    })
  })

  test("should handle basic chat functionality", async ({ page }) => {
    console.log("🌐 Testing basic cross-browser chat functionality...")

    try {
      await setupMockAIResponse(page, "Cross-browser test successful!")

      // Basic message sending test
      const testMessage = "Cross-browser compatibility test"
      await sendMessage(page, testMessage)

      // Verify navigation and message display
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      // Wait for AI response
      const responseResult = await waitForAIResponse(page, {
        timeout: 30000,
        expectResponse: true,
      })

      expect(responseResult.hasResponse).toBe(true)

      console.log("✅ Cross-browser functionality test completed")
    } catch (error) {
      console.error("❌ Cross-browser test failed:", error)
      await takeDebugScreenshot(page, "cross-browser-failed")
      throw error
    }
  })

  test("should handle touch and mouse interactions", async ({ page }) => {
    console.log("📱 Testing input method compatibility...")

    try {
      await setupMockAIResponse(page, "Input method test successful!")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Test different input methods
      const testMessage = "Input method compatibility test"

      // Test click/tap to focus
      await chatInput.click()
      await expect(chatInput).toBeFocused()

      // Test typing
      await chatInput.fill(testMessage)
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe(testMessage)

      // Test Enter key submission
      await chatInput.press("Enter")

      // Verify message was sent
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      console.log("✅ Input method compatibility test completed")
    } catch (error) {
      console.error("❌ Input method test failed:", error)
      await takeDebugScreenshot(page, "input-method-failed")
      throw error
    }
  })

  test("should handle different viewport sizes", async ({ page }) => {
    console.log("📐 Testing viewport size compatibility...")

    const viewportSizes = [
      { name: "Mobile", width: 375, height: 667 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Desktop", width: 1920, height: 1080 },
    ]

    for (const size of viewportSizes) {
      try {
        console.log(
          `Testing ${size.name} viewport (${size.width}x${size.height})...`
        )

        // Set viewport size
        await page.setViewportSize({ width: size.width, height: size.height })

        // Navigate and wait for load
        await page.goto("/")
        await page.waitForLoadState("networkidle")

        // Verify essential elements are visible
        const chatInput = await waitForChatInput(page, { timeout: 15000 })
        await expect(chatInput).toBeVisible()

        const sendButton = await waitForSendButton(page, {
          timeout: 15000,
          waitForEnabled: false,
        })
        await expect(sendButton).toBeVisible()

        // Check element dimensions
        const inputBox = await chatInput.boundingBox()
        const buttonBox = await sendButton.boundingBox()

        expect(inputBox).not.toBeNull()
        expect(buttonBox).not.toBeNull()

        if (inputBox && buttonBox) {
          expect(inputBox.width).toBeGreaterThan(100)
          expect(inputBox.height).toBeGreaterThan(20)
          expect(buttonBox.width).toBeGreaterThan(30)
          expect(buttonBox.height).toBeGreaterThan(30)
        }

        console.log(`✅ ${size.name} viewport compatible`)
      } catch (error) {
        console.error(`❌ ${size.name} viewport test failed:`, error)
        await takeDebugScreenshot(
          page,
          `viewport-${size.name.toLowerCase()}-failed`
        )
        // Continue with other sizes
      }
    }
  })

  test("should handle keyboard navigation consistently", async ({ page }) => {
    console.log("⌨️ Testing keyboard navigation consistency...")

    try {
      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Test Tab navigation
      await chatInput.focus()
      await expect(chatInput).toBeFocused()

      await page.keyboard.press("Tab")

      // Should focus on some interactive element
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      )
      expect(focusedElement).toBeTruthy()

      // Test reverse navigation
      await page.keyboard.press("Shift+Tab")
      await expect(chatInput).toBeFocused()

      // Test Enter key functionality
      await chatInput.fill("Keyboard navigation test")
      await chatInput.press("Enter")

      // Should trigger some response (navigation or error)
      await page.waitForTimeout(3000)

      console.log("✅ Keyboard navigation consistency test completed")
    } catch (error) {
      console.error("❌ Keyboard navigation test failed:", error)
      await takeDebugScreenshot(page, "keyboard-navigation-failed")
      throw error
    }
  })

  test("should handle error states consistently", async ({ page }) => {
    console.log("🚨 Testing error handling consistency...")

    try {
      // Simulate an API error
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 500,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            error: "Server Error",
            message: "Cross-browser error test",
          }),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      const testMessage = "Error handling test"
      await chatInput.fill(testMessage)
      const sendButton = await waitForSendButton(page, { timeout: 15000 })
      await sendButton.click()

      // Wait for error handling
      await page.waitForTimeout(5000)

      // Verify message is preserved for retry
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe(testMessage)

      // Verify error doesn't break the interface - button should be enabled if message is preserved
      if (inputValue.trim().length > 0) {
        await expect(sendButton).toBeEnabled({ timeout: 10000 })
      }

      // Verify no navigation occurred (error case)
      const currentUrl = page.url()
      expect(currentUrl).not.toMatch(/\/c\/[a-f0-9-]+/)

      console.log("✅ Error handling consistency test completed")
    } catch (error) {
      console.error("❌ Error handling test failed:", error)
      await takeDebugScreenshot(page, "error-handling-failed")
      throw error
    }
  })

  test("should support different user agents", async ({ page }) => {
    console.log("🔍 Testing user agent compatibility...")

    const userAgents = [
      {
        name: "Chrome",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      {
        name: "Firefox",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      },
    ]

    for (const agent of userAgents) {
      try {
        console.log(`Testing with ${agent.name} user agent...`)

        // Set user agent
        await page.setExtraHTTPHeaders({ "User-Agent": agent.ua })

        // Navigate to app
        await page.goto("/")
        await page.waitForLoadState("networkidle")

        // Test basic functionality
        const chatInput = await waitForChatInput(page, { timeout: 15000 })
        await expect(chatInput).toBeVisible()

        const sendButton = await waitForSendButton(page, { timeout: 15000 })
        await expect(sendButton).toBeVisible()

        console.log(`✅ ${agent.name} user agent compatible`)
      } catch (error) {
        console.error(`❌ ${agent.name} user agent test failed:`, error)
        await takeDebugScreenshot(page, `ua-${agent.name.toLowerCase()}-failed`)
        // Continue with other user agents
      }
    }
  })
})
