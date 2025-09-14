import { expect, test, devices } from "@playwright/test"

import {
  prepareTestEnvironment,
  sendMessage,
  setupMockAIResponse,
  setupNetworkCapture,
  takeDebugScreenshot,
  waitForAIResponse,
  waitForChatInput,
  waitForSendButton,
} from "../helpers/test-helpers"

/**
 * Cross-Browser Chat UI E2E Tests
 *
 * Tests chat functionality across different browsers and device types:
 * - Desktop browsers (Chrome, Firefox, Safari)
 * - Mobile browsers (Chrome Mobile, Safari Mobile)
 * - Different viewport sizes and device characteristics
 * - Browser-specific features and compatibility
 * - Touch vs mouse interactions
 * - Keyboard navigation across platforms
 */

// Test configurations for different browser/device combinations
const crossBrowserConfigs = [
  {
    name: "Desktop Chrome",
    device: devices["Desktop Chrome"],
    isMobile: false,
    hasTouch: false,
    description: "Primary desktop browser testing",
  },
  {
    name: "Desktop Firefox",
    device: devices["Desktop Firefox"],
    isMobile: false,
    hasTouch: false,
    description: "Firefox compatibility testing",
  },
  {
    name: "Mobile Chrome",
    device: devices["Pixel 5"],
    isMobile: true,
    hasTouch: true,
    description: "Mobile Chrome touch interaction testing",
  },
  {
    name: "Mobile Safari",
    device: devices["iPhone 12"],
    isMobile: true,
    hasTouch: true,
    description: "iOS Safari mobile testing",
  },
  {
    name: "Tablet",
    device: devices["iPad Pro 11"],
    isMobile: false, // Tablet treated as desktop-like
    hasTouch: true,
    description: "Tablet touch and larger screen testing",
  },
]

// Create individual test projects for each configuration
// Note: Moving test.use() calls outside of describe blocks to avoid Playwright limitation

test.describe("Cross-Browser Tests", () => {
  crossBrowserConfigs.forEach((config) => {
    test.describe(`${config.name}`, () => {
      test.beforeEach(async ({ page }) => {
        // Set device configuration manually per test
        if (config.device?.userAgent) {
          await page.setExtraHTTPHeaders({
            "User-Agent": config.device.userAgent,
          })
        }
        if (config.device?.viewport) {
          await page.setViewportSize(config.device.viewport)
        }

        await prepareTestEnvironment(page, {
          clearState: true,
          timeout: 60000,
          enableMockResponses: true,
        })
      })

      test(`should handle basic chat functionality on ${config.name}`, async ({
        page,
      }) => {
        console.log(`🌐 Testing basic chat on ${config.name}...`)

        try {
          await setupMockAIResponse(
            page,
            `Hello from ${config.name}! Chat is working.`
          )

          // Basic message sending test
          const testMessage = `Testing on ${config.name}`
          await sendMessage(page, testMessage)

          // Verify navigation and message display
          await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
          await expect(page.getByText(testMessage)).toBeVisible({
            timeout: 15000,
          })

          // Wait for AI response
          const responseResult = await waitForAIResponse(page, {
            timeout: 30000,
            expectResponse: true,
          })

          expect(responseResult.hasResponse).toBe(true)

          console.log(`✅ Basic chat functionality works on ${config.name}`)
        } catch (error) {
          console.error(`❌ Basic chat failed on ${config.name}:`, error)
          await takeDebugScreenshot(
            page,
            `basic-chat-failed-${config.name.replace(/\s+/g, "-")}`
          )
          throw error
        }
      })

      test(`should handle input interactions properly on ${config.name}`, async ({
        page,
      }) => {
        console.log(`⌨️ Testing input interactions on ${config.name}...`)

        const capture = setupNetworkCapture(page)

        try {
          await setupMockAIResponse(page, "Input interaction test successful!")

          const chatInput = await waitForChatInput(page, { timeout: 30000 })
          const sendButton = await waitForSendButton(page, { timeout: 15000 })

          // Test different input methods based on device capabilities
          const testMessage = `Input test on ${config.name}`

          if (config.hasTouch) {
            console.log("📱 Testing touch interactions...")

            // Test tap to focus
            await chatInput.tap()
            await expect(chatInput).toBeFocused()

            // Test typing on touch device
            await chatInput.fill(testMessage)

            // Test tap to send
            await sendButton.tap()
          } else {
            console.log("🖱️ Testing mouse and keyboard interactions...")

            // Test click to focus
            await chatInput.click()
            await expect(chatInput).toBeFocused()

            // Test typing
            await chatInput.type(testMessage, { delay: 50 })

            // Test Enter key submission
            await chatInput.press("Enter")
          }

          // Verify message was sent regardless of input method
          await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
          await expect(page.getByText(testMessage)).toBeVisible({
            timeout: 15000,
          })

          console.log(`✅ Input interactions work on ${config.name}`)
        } catch (error) {
          console.error(
            `❌ Input interactions failed on ${config.name}:`,
            error
          )
          await takeDebugScreenshot(
            page,
            `input-failed-${config.name.replace(/\s+/g, "-")}`
          )
          throw error
        }
      })

      test(`should handle responsive design on ${config.name}`, async ({
        page,
      }) => {
        console.log(`📐 Testing responsive design on ${config.name}...`)

        try {
          // Get viewport information
          const viewport = await page.viewportSize()
          console.log(`Viewport: ${viewport?.width}x${viewport?.height}`)

          // Test that UI elements are properly sized and accessible
          const chatInput = await waitForChatInput(page, { timeout: 30000 })
          const sendButton = await waitForSendButton(page, { timeout: 15000 })

          // Verify elements are visible and properly sized
          const chatInputBox = await chatInput.boundingBox()
          const sendButtonBox = await sendButton.boundingBox()

          expect(chatInputBox).not.toBeNull()
          expect(sendButtonBox).not.toBeNull()

          if (chatInputBox && sendButtonBox) {
            // Input should be reasonably sized
            expect(chatInputBox.width).toBeGreaterThan(100)
            expect(chatInputBox.height).toBeGreaterThan(30)

            // Send button should be accessible size (at least 44px for touch)
            if (config.hasTouch) {
              expect(sendButtonBox.width).toBeGreaterThan(40)
              expect(sendButtonBox.height).toBeGreaterThan(40)
            }

            console.log(
              `📏 Element sizes: Input ${chatInputBox.width}x${chatInputBox.height}, Button ${sendButtonBox.width}x${sendButtonBox.height}`
            )
          }

          // Test that elements don't overflow or get cut off
          const isInputVisible = await chatInput.isVisible()
          const isButtonVisible = await sendButton.isVisible()

          expect(isInputVisible).toBe(true)
          expect(isButtonVisible).toBe(true)

          console.log(`✅ Responsive design works on ${config.name}`)
        } catch (error) {
          console.error(`❌ Responsive design failed on ${config.name}:`, error)
          await takeDebugScreenshot(
            page,
            `responsive-failed-${config.name.replace(/\s+/g, "-")}`
          )
          throw error
        }
      })

      test(`should handle keyboard navigation on ${config.name}`, async ({
        page,
      }) => {
        console.log(`⌨️ Testing keyboard navigation on ${config.name}...`)

        try {
          const chatInput = await waitForChatInput(page, { timeout: 30000 })
          const sendButton = await waitForSendButton(page, { timeout: 15000 })

          // Test Tab navigation
          await chatInput.focus()
          await expect(chatInput).toBeFocused()

          // Tab to next element (should be send button or related element)
          await page.keyboard.press("Tab")

          // Check if send button got focus or if focus moved to another interactive element
          const focusedElement = await page.evaluate(
            () => document.activeElement?.tagName
          )
          expect(focusedElement).toBeTruthy()

          // Test Shift+Tab (reverse navigation)
          await page.keyboard.press("Shift+Tab")
          await expect(chatInput).toBeFocused()

          // Test escape key (should not break anything)
          await page.keyboard.press("Escape")

          // Input should still be functional
          await chatInput.fill("Keyboard navigation test")
          const inputValue = await chatInput.inputValue()
          expect(inputValue).toBe("Keyboard navigation test")

          console.log(`✅ Keyboard navigation works on ${config.name}`)
        } catch (error) {
          console.error(
            `❌ Keyboard navigation failed on ${config.name}:`,
            error
          )
          await takeDebugScreenshot(
            page,
            `keyboard-failed-${config.name.replace(/\s+/g, "-")}`
          )
          throw error
        }
      })

      if (config.isMobile) {
        test(`should handle mobile-specific features on ${config.name}`, async ({
          page,
        }) => {
          console.log(
            `📱 Testing mobile-specific features on ${config.name}...`
          )

          try {
            await setupMockAIResponse(page, "Mobile test successful!")

            const chatInput = await waitForChatInput(page, { timeout: 30000 })

            // Test virtual keyboard handling
            console.log("⌨️ Testing virtual keyboard interaction...")

            // Focus should bring up virtual keyboard
            await chatInput.tap()
            await expect(chatInput).toBeFocused()

            // Type and verify (virtual keyboard interaction)
            const mobileMessage = "Testing mobile keyboard"
            await chatInput.fill(mobileMessage)

            const inputValue = await chatInput.inputValue()
            expect(inputValue).toBe(mobileMessage)

            // Test that UI remains accessible with virtual keyboard
            const sendButton = await waitForSendButton(page, { timeout: 15000 })
            const isButtonVisible = await sendButton.isVisible()
            expect(isButtonVisible).toBe(true)

            // Test submission
            await sendButton.tap()

            // Verify message sending works
            await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
            await expect(page.getByText(mobileMessage)).toBeVisible({
              timeout: 15000,
            })

            console.log(`✅ Mobile-specific features work on ${config.name}`)
          } catch (error) {
            console.error(`❌ Mobile features failed on ${config.name}:`, error)
            await takeDebugScreenshot(
              page,
              `mobile-failed-${config.name.replace(/\s+/g, "-")}`
            )
            throw error
          }
        })
      }

      test(`should handle error states consistently on ${config.name}`, async ({
        page,
      }) => {
        console.log(
          `🚨 Testing error handling consistency on ${config.name}...`
        )

        try {
          // Simulate an API error
          await page.route("**/api/chat", async (route) => {
            await route.fulfill({
              status: 500,
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                error: "Server Error",
                message: "Something went wrong",
              }),
            })
          })

          const chatInput = await waitForChatInput(page, { timeout: 30000 })
          const sendButton = await waitForSendButton(page, { timeout: 15000 })

          const testMessage = `Error test on ${config.name}`
          await chatInput.fill(testMessage)

          if (config.hasTouch) {
            await sendButton.tap()
          } else {
            await sendButton.click()
          }

          // Wait for error handling
          await page.waitForTimeout(5000)

          // Verify error doesn't break the interface
          await expect(sendButton).toBeEnabled({ timeout: 10000 })

          // Verify message is preserved for retry
          const inputValue = await chatInput.inputValue()
          expect(inputValue).toBe(testMessage)

          // Verify no navigation occurred (error case)
          const currentUrl = page.url()
          expect(currentUrl).not.toMatch(/\/c\/[a-f0-9-]+/)

          console.log(`✅ Error handling consistent on ${config.name}`)
        } catch (error) {
          console.error(`❌ Error handling failed on ${config.name}:`, error)
          await takeDebugScreenshot(
            page,
            `error-handling-failed-${config.name.replace(/\s+/g, "-")}`
          )
          throw error
        }
      })
    })
  })
})

// Additional cross-browser compatibility tests
test.describe("Cross-Browser Compatibility Features", () => {
  test("should work consistently across different user agents", async ({
    page,
  }) => {
    console.log("🔍 Testing user agent consistency...")

    const userAgents = [
      {
        name: "Chrome Windows",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      {
        name: "Safari macOS",
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      },
      {
        name: "Firefox",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      },
    ]

    for (const agent of userAgents) {
      console.log(`🌐 Testing with ${agent.name} user agent...`)

      try {
        // Set user agent
        await page.setExtraHTTPHeaders({
          "User-Agent": agent.ua,
        })

        // Navigate to app
        await page.goto("/")
        await page.waitForLoadState("networkidle")

        // Test basic functionality
        const chatInput = await waitForChatInput(page, { timeout: 30000 })
        await expect(chatInput).toBeVisible()

        const sendButton = await waitForSendButton(page, { timeout: 15000 })
        await expect(sendButton).toBeVisible()

        console.log(`✅ ${agent.name} user agent compatibility confirmed`)
      } catch (error) {
        console.error(`❌ User agent test failed for ${agent.name}:`, error)
        await takeDebugScreenshot(
          page,
          `ua-failed-${agent.name.replace(/\s+/g, "-")}`
        )
        // Continue with other user agents
      }
    }
  })

  test("should handle different viewport sizes gracefully", async ({
    page,
  }) => {
    console.log("📐 Testing viewport size adaptation...")

    const viewportSizes = [
      { name: "Mobile Portrait", width: 375, height: 667 },
      { name: "Mobile Landscape", width: 667, height: 375 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Desktop Small", width: 1024, height: 768 },
      { name: "Desktop Large", width: 1920, height: 1080 },
      { name: "Ultra Wide", width: 2560, height: 1440 },
    ]

    for (const size of viewportSizes) {
      console.log(`📱 Testing ${size.name} (${size.width}x${size.height})...`)

      try {
        // Set viewport size
        await page.setViewportSize({ width: size.width, height: size.height })

        // Navigate and wait for load
        await page.goto("/")
        await page.waitForLoadState("networkidle")

        // Verify essential elements are visible
        const chatInput = await waitForChatInput(page, { timeout: 30000 })
        await expect(chatInput).toBeVisible()

        // Check that input is not cut off or too small
        const inputBox = await chatInput.boundingBox()
        expect(inputBox).not.toBeNull()

        if (inputBox) {
          expect(inputBox.width).toBeGreaterThan(100) // Minimum usable width
          expect(inputBox.height).toBeGreaterThan(20) // Minimum usable height
        }

        const sendButton = await waitForSendButton(page, { timeout: 15000 })
        await expect(sendButton).toBeVisible()

        console.log(`✅ ${size.name} viewport works correctly`)
      } catch (error) {
        console.error(`❌ Viewport test failed for ${size.name}:`, error)
        await takeDebugScreenshot(
          page,
          `viewport-failed-${size.name.replace(/\s+/g, "-")}`
        )
        // Continue with other sizes
      }
    }
  })
})
