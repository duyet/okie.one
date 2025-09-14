import { expect, test } from "@playwright/test"

import {
  prepareTestEnvironment,
  sendMessage,
  setupNetworkCapture,
  setupMockAIResponse,
  takeDebugScreenshot,
  waitForAIResponse,
  waitForChatInput,
  waitForSendButton,
} from "../helpers/test-helpers"

/**
 * Comprehensive Chat UI E2E Tests
 *
 * Tests the complete chat interface functionality including:
 * - Message sending through the actual UI components
 * - API integration with validation fixes
 * - Error handling and user feedback
 * - Loading states and transitions
 * - Cross-browser compatibility
 */

test.describe("Chat Interface UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    await prepareTestEnvironment(page, {
      clearState: true,
      timeout: 60000,
      enableMockResponses: true,
    })
  })

  test("should successfully send message through chat UI components", async ({
    page,
  }) => {
    const testMessage = "Hello, this is a UI test message"
    const expectedResponse = "I received your UI test message successfully!"

    console.log("🧪 Testing complete UI message sending flow...")

    // Setup network monitoring
    const capture = setupNetworkCapture(page)

    try {
      // Setup mock response for reliable testing
      await setupMockAIResponse(page, expectedResponse)

      // Verify chat input is available and functional
      console.log("🔍 Locating chat input element...")
      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      await expect(chatInput).toBeVisible()
      await expect(chatInput).toBeEnabled()

      // Verify placeholder text shows correctly
      const placeholder = await chatInput.getAttribute("placeholder")
      console.log(`📝 Input placeholder: "${placeholder}"`)
      expect(placeholder).toContain("What's on your mind")

      // Type message character by character to simulate real user interaction
      console.log("✍️ Typing message with realistic simulation...")
      await chatInput.clear()
      await chatInput.type(testMessage, { delay: 50 }) // 50ms between characters

      // Verify message was typed correctly
      const typedValue = await chatInput.inputValue()
      expect(typedValue).toBe(testMessage)

      // Locate and verify send button
      console.log("🔘 Locating send button...")
      const sendButton = await waitForSendButton(page, { timeout: 15000 })
      await expect(sendButton).toBeVisible()
      await expect(sendButton).toBeEnabled()

      // Verify button has correct accessibility attributes
      const ariaLabel = await sendButton.getAttribute("aria-label")
      expect(ariaLabel).toContain("Send message")

      // Click send button with timing
      const sendTime = Date.now()
      console.log("📤 Clicking send button...")
      await sendButton.click()

      // Verify immediate UI feedback
      console.log("⚡ Checking immediate UI response...")

      // Send button should be temporarily disabled during processing
      await expect(sendButton).toBeDisabled({ timeout: 5000 })

      // Message should appear in chat area
      console.log("👀 Verifying user message appears...")
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      // Verify URL navigation (should go to chat page)
      console.log("🔗 Checking URL navigation...")
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })

      // Wait for AI response
      console.log("🤖 Waiting for AI response...")
      const responseResult = await waitForAIResponse(page, {
        timeout: 30000,
        expectResponse: true,
        expectReasoning: false,
      })

      expect(responseResult.hasResponse).toBe(true)

      // Verify AI response content
      console.log("✅ Verifying AI response content...")
      await expect(page.getByText(expectedResponse)).toBeVisible({
        timeout: 15000,
      })

      // Verify both messages remain visible
      await expect(page.getByText(testMessage)).toBeVisible()
      await expect(page.getByText(expectedResponse)).toBeVisible()

      // Measure response time
      const responseTime = Date.now() - sendTime
      console.log(`⏱️ Total response time: ${responseTime}ms`)

      // Verify send button is re-enabled
      await expect(sendButton).toBeEnabled({ timeout: 5000 })

      // Verify chat input is clear and ready for next message
      const finalInputValue = await chatInput.inputValue()
      expect(finalInputValue).toBe("")
      await expect(chatInput).toBeEnabled()

      console.log("✅ UI message sending test completed successfully")
    } catch (error) {
      console.error("❌ UI message sending test failed:", error)

      // Enhanced debugging
      console.log("📊 Network activity analysis:")
      const chatRequests = capture.requests.filter((req) =>
        req.url.includes("/api/chat")
      )
      const createChatRequests = capture.requests.filter((req) =>
        req.url.includes("/api/create-chat")
      )

      console.log(`  - Chat API requests: ${chatRequests.length}`)
      console.log(`  - Create chat requests: ${createChatRequests.length}`)

      if (chatRequests.length > 0) {
        console.log("  - Last chat request:", {
          url: chatRequests[chatRequests.length - 1].url,
          method: chatRequests[chatRequests.length - 1].method,
          status: chatRequests[chatRequests.length - 1].response?.status,
        })
      }

      await takeDebugScreenshot(page, "ui-message-sending-failed")
      throw error
    }
  })

  test("should handle form submission with Enter key", async ({ page }) => {
    const testMessage = "Testing Enter key submission"
    const capture = setupNetworkCapture(page)

    console.log("⌨️ Testing Enter key submission...")

    try {
      await setupMockAIResponse(page, "Message received via Enter key!")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Type message
      await chatInput.fill(testMessage)

      // Submit with Enter key (should trigger form submission)
      console.log("⏎ Pressing Enter to submit...")
      await chatInput.press("Enter")

      // Verify message was sent
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      // Verify navigation occurred
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })

      // Wait for AI response
      await waitForAIResponse(page, {
        timeout: 30000,
        expectResponse: true,
      })

      console.log("✅ Enter key submission test completed")
    } catch (error) {
      console.error("❌ Enter key submission test failed:", error)
      await takeDebugScreenshot(page, "enter-key-submission-failed")
      throw error
    }
  })

  test("should handle rapid consecutive message submissions", async ({
    page,
  }) => {
    const messages = [
      "First rapid message",
      "Second rapid message",
      "Third rapid message",
    ]

    console.log("⚡ Testing rapid message submission handling...")

    const capture = setupNetworkCapture(page)

    try {
      // Setup mock responses
      await setupMockAIResponse(page, "I received your rapid message!")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      // Send first message
      await chatInput.fill(messages[0])
      await sendButton.click()

      // Wait for navigation to chat page
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })

      // Verify first message appears
      await expect(page.getByText(messages[0])).toBeVisible({ timeout: 15000 })

      // Try to send second message quickly (should handle gracefully)
      console.log("📤 Attempting rapid second message...")

      // Wait for send button to be re-enabled
      await expect(sendButton).toBeEnabled({ timeout: 10000 })

      await chatInput.fill(messages[1])
      await sendButton.click()

      // Verify second message handling
      await expect(page.getByText(messages[1])).toBeVisible({ timeout: 15000 })

      // Verify both messages are visible
      await expect(page.getByText(messages[0])).toBeVisible()
      await expect(page.getByText(messages[1])).toBeVisible()

      console.log("✅ Rapid message submission test completed")
    } catch (error) {
      console.error("❌ Rapid message submission test failed:", error)

      // Check for rate limiting or error states
      const errorElements = await page.locator('[role="alert"], .error').count()
      if (errorElements > 0) {
        const errors = await page
          .locator('[role="alert"], .error')
          .allTextContents()
        console.log("🚨 UI errors detected:", errors)
      }

      await takeDebugScreenshot(page, "rapid-submission-failed")
      throw error
    }
  })

  test("should show proper loading states during message processing", async ({
    page,
  }) => {
    const testMessage = "Testing loading states"

    console.log("🔄 Testing loading states and UI feedback...")

    try {
      // Setup mock response with delay
      await page.route("**/api/chat", async (route) => {
        // Add delay to observe loading states
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: `0:"Loading state test response completed!"\n`,
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      await chatInput.fill(testMessage)

      // Click send and immediately check for loading states
      console.log("📤 Sending message and monitoring loading states...")
      await sendButton.click()

      // Verify send button shows loading state
      console.log("⏳ Checking send button loading state...")
      await expect(sendButton).toBeDisabled({ timeout: 5000 })

      // Verify message appears in UI immediately (optimistic update)
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 })

      // Check for loading indicators (spinner, disabled state, etc.)
      const loadingIndicators = page.locator(
        '[data-testid*="loading"], .loading, [aria-label*="loading"]'
      )
      const hasLoadingIndicator = (await loadingIndicators.count()) > 0

      if (hasLoadingIndicator) {
        console.log("✅ Loading indicators found")
        await expect(loadingIndicators.first()).toBeVisible({ timeout: 5000 })
      }

      // Wait for loading to complete
      console.log("⏳ Waiting for loading to complete...")
      await expect(sendButton).toBeEnabled({ timeout: 15000 })

      // Verify response appears
      await expect(page.getByText(/Loading state test response/)).toBeVisible({
        timeout: 10000,
      })

      console.log("✅ Loading states test completed")
    } catch (error) {
      console.error("❌ Loading states test failed:", error)
      await takeDebugScreenshot(page, "loading-states-failed")
      throw error
    }
  })

  test("should maintain proper focus management", async ({ page }) => {
    const testMessage = "Testing focus management"

    console.log("🎯 Testing keyboard navigation and focus management...")

    try {
      await setupMockAIResponse(page, "Focus management test response")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Verify initial focus state
      console.log("🔍 Checking initial focus state...")
      await chatInput.focus()
      await expect(chatInput).toBeFocused()

      // Type message
      await chatInput.fill(testMessage)

      // Use Tab to navigate to send button
      console.log("⇥ Using Tab navigation to send button...")
      await page.keyboard.press("Tab")

      const sendButton = await waitForSendButton(page, { timeout: 15000 })
      await expect(sendButton).toBeFocused()

      // Submit with Space key (accessibility requirement)
      console.log("⎵ Submitting with Space key...")
      await page.keyboard.press("Space")

      // Verify message was sent
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      // Verify focus returns to chat input after submission
      console.log("🔄 Checking focus returns to input...")
      await expect(chatInput).toBeFocused({ timeout: 10000 })

      // Verify input is cleared and ready
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe("")

      console.log("✅ Focus management test completed")
    } catch (error) {
      console.error("❌ Focus management test failed:", error)
      await takeDebugScreenshot(page, "focus-management-failed")
      throw error
    }
  })

  test("should handle large message content properly", async ({ page }) => {
    // Create a large message to test text area handling
    const largeMessage =
      "This is a test of handling large message content. ".repeat(50) +
      "The interface should handle this gracefully without breaking or causing performance issues."

    console.log("📏 Testing large message content handling...")

    try {
      await setupMockAIResponse(
        page,
        "I received your large message successfully!"
      )

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Fill with large content
      console.log("✍️ Filling large message content...")
      await chatInput.fill(largeMessage)

      // Verify content was filled
      const inputValue = await chatInput.inputValue()
      expect(inputValue).toBe(largeMessage)

      // Verify textarea expands properly (check height)
      const initialHeight = await chatInput.evaluate((el) => el.scrollHeight)
      expect(initialHeight).toBeGreaterThan(50) // Should expand beyond single line

      // Send message
      const sendButton = await waitForSendButton(page, { timeout: 15000 })
      await sendButton.click()

      // Verify navigation and message display
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })

      // Large message should be visible (might be truncated in display)
      const displayedMessage = page.getByText(largeMessage.substring(0, 100))
      await expect(displayedMessage).toBeVisible({ timeout: 15000 })

      console.log("✅ Large message handling test completed")
    } catch (error) {
      console.error("❌ Large message handling test failed:", error)
      await takeDebugScreenshot(page, "large-message-failed")
      throw error
    }
  })

  test("should preserve message during page navigation", async ({ page }) => {
    const testMessage = "Message persistence test"

    console.log("🔄 Testing message persistence during navigation...")

    try {
      await setupMockAIResponse(page, "Message preserved successfully!")

      // Send message first
      await sendMessage(page, testMessage)

      // Verify we're on chat page
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
      const chatUrl = page.url()

      // Verify message is visible
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      // Navigate away and back
      console.log("🔗 Navigating away and back...")
      await page.goto("/")
      await expect(page.getByText(/What's on your mind/)).toBeVisible({
        timeout: 15000,
      })

      // Navigate back to chat
      await page.goto(chatUrl)

      // Verify message is still there
      console.log("👀 Checking message persistence...")
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 15000 })

      console.log("✅ Message persistence test completed")
    } catch (error) {
      console.error("❌ Message persistence test failed:", error)
      await takeDebugScreenshot(page, "message-persistence-failed")
      throw error
    }
  })
})

test.describe("Chat Interface Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await prepareTestEnvironment(page, { clearState: true, timeout: 60000 })
  })

  test("should meet accessibility standards", async ({ page }) => {
    console.log("♿ Testing accessibility compliance...")

    try {
      // Check for proper ARIA labels and roles
      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, { timeout: 15000 })

      // Verify ARIA attributes
      const inputAriaLabel = await chatInput.getAttribute("aria-label")
      const buttonAriaLabel = await sendButton.getAttribute("aria-label")

      // Chat input should have proper labeling
      expect(
        inputAriaLabel || (await chatInput.getAttribute("placeholder"))
      ).toBeTruthy()

      // Send button should have proper labeling
      expect(buttonAriaLabel).toContain("Send")

      // Check for proper heading structure
      const headings = page.locator("h1, h2, h3, h4, h5, h6")
      const headingCount = await headings.count()
      expect(headingCount).toBeGreaterThan(0)

      // Test keyboard navigation
      console.log("⌨️ Testing keyboard navigation...")
      await chatInput.focus()
      await expect(chatInput).toBeFocused()

      await page.keyboard.press("Tab")
      await expect(sendButton).toBeFocused()

      console.log("✅ Accessibility tests completed")
    } catch (error) {
      console.error("❌ Accessibility test failed:", error)
      await takeDebugScreenshot(page, "accessibility-failed")
      throw error
    }
  })

  test("should support screen reader announcements", async ({ page }) => {
    console.log("📢 Testing screen reader support...")

    try {
      await setupMockAIResponse(page, "Screen reader test response")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Check for live regions that would announce new messages
      const liveRegions = page.locator(
        '[aria-live], [role="status"], [role="alert"]'
      )
      const liveRegionCount = await liveRegions.count()

      // Should have at least one live region for message announcements
      expect(liveRegionCount).toBeGreaterThan(0)

      // Send message and check for announcement
      await sendMessage(page, "Screen reader test message")

      // Verify message appears (would be announced to screen reader)
      await expect(page.getByText("Screen reader test message")).toBeVisible({
        timeout: 15000,
      })

      console.log("✅ Screen reader support test completed")
    } catch (error) {
      console.error("❌ Screen reader support test failed:", error)
      await takeDebugScreenshot(page, "screen-reader-failed")
      throw error
    }
  })
})
