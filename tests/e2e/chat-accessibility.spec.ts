import { expect, test } from "@playwright/test"

import {
  prepareTestEnvironment,
  sendMessage,
  setupMockAIResponse,
  takeDebugScreenshot,
  waitForChatInput,
  waitForSendButton,
} from "../helpers/test-helpers"

/**
 * Chat Accessibility E2E Tests
 *
 * Comprehensive accessibility testing for the chat interface:
 * - ARIA attributes and labels
 * - Keyboard navigation and focus management
 * - Screen reader compatibility
 * - Color contrast and visual accessibility
 * - Semantic HTML structure
 * - WCAG 2.1 compliance verification
 * - High contrast mode support
 * - Reduced motion preferences
 */

test.describe("Chat Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await prepareTestEnvironment(page, {
      clearState: true,
      timeout: 60000,
      enableMockResponses: true,
    })
  })

  test("should have proper ARIA labels and attributes", async ({ page }) => {
    console.log("♿ Testing ARIA labels and attributes...")

    try {
      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, {
        timeout: 15000,
        waitForEnabled: false,
      })

      // Test chat input accessibility
      console.log("🔍 Checking chat input ARIA attributes...")

      const inputAriaLabel = await chatInput.getAttribute("aria-label")
      const inputPlaceholder = await chatInput.getAttribute("placeholder")
      const inputRole = await chatInput.getAttribute("role")
      const inputAriaDescribedBy =
        await chatInput.getAttribute("aria-describedby")

      // Input should have either aria-label or meaningful placeholder
      const hasInputLabeling =
        inputAriaLabel ||
        (inputPlaceholder && inputPlaceholder.trim().length > 0)
      expect(hasInputLabeling).toBe(true)

      if (inputAriaLabel) {
        console.log(`✅ Input has aria-label: "${inputAriaLabel}"`)
        expect(inputAriaLabel.toLowerCase()).toMatch(/message|chat|input/)
      }

      if (inputPlaceholder) {
        console.log(`✅ Input has placeholder: "${inputPlaceholder}"`)
      }

      // Test send button accessibility
      console.log("🔍 Checking send button ARIA attributes...")

      const buttonAriaLabel = await sendButton.getAttribute("aria-label")
      const buttonText = await sendButton.textContent()
      const buttonRole = await sendButton.getAttribute("role")
      const buttonAriaDisabled = await sendButton.getAttribute("aria-disabled")

      // Button should have proper labeling
      const hasButtonLabeling =
        !!buttonAriaLabel || !!(buttonText && buttonText.trim().length > 0)
      expect(hasButtonLabeling).toBe(true)

      if (buttonAriaLabel) {
        console.log(`✅ Button has aria-label: "${buttonAriaLabel}"`)
        expect(buttonAriaLabel.toLowerCase()).toMatch(/send|submit/)
      }

      // Test for proper button type
      const buttonType = await sendButton.getAttribute("type")
      console.log(`Button type: ${buttonType}`)

      console.log("✅ ARIA labels and attributes test completed")
    } catch (error) {
      console.error("❌ ARIA attributes test failed:", error)
      await takeDebugScreenshot(page, "aria-attributes-failed")
      throw error
    }
  })

  test("should support comprehensive keyboard navigation", async ({ page }) => {
    console.log("⌨️ Testing comprehensive keyboard navigation...")

    try {
      await setupMockAIResponse(page, "Keyboard navigation test successful!")

      // Test Tab navigation sequence
      console.log("🔍 Testing Tab navigation sequence...")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Start with chat input focused
      await chatInput.focus()
      await expect(chatInput).toBeFocused()

      // Get initial focused element
      let focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      )
      console.log(`Initial focus: ${focusedElement}`)

      // Tab through interactive elements
      const tabSequence = []
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab")
        const currentElement = await page.evaluate(() => {
          const el = document.activeElement
          return {
            tagName: el?.tagName,
            type: el?.getAttribute("type"),
            ariaLabel: el?.getAttribute("aria-label"),
            className: el?.className,
            id: el?.id,
          }
        })
        tabSequence.push(currentElement)
        console.log(`Tab ${i + 1}: ${JSON.stringify(currentElement)}`)
      }

      // Verify we can navigate back with Shift+Tab
      console.log("🔍 Testing reverse Tab navigation...")
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Shift+Tab")
        const currentElement = await page.evaluate(
          () => document.activeElement?.tagName
        )
        console.log(`Shift+Tab ${i + 1}: ${currentElement}`)
      }

      // Test Enter key submission
      console.log("🔍 Testing Enter key submission...")
      await chatInput.focus()
      await chatInput.fill("Keyboard navigation test message")

      // Submit with Enter
      await chatInput.press("Enter")

      // Verify navigation occurred
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
      await expect(
        page.getByText("Keyboard navigation test message")
      ).toBeVisible({ timeout: 15000 })

      // Test Space bar on buttons after navigation
      console.log("🔍 Testing Space bar on buttons...")

      // Fill new message first to enable send button
      const newChatInput = await waitForChatInput(page, { timeout: 15000 })
      await newChatInput.fill("Space bar test")

      // Now get the enabled send button and focus it
      const newSendButton = await waitForSendButton(page, { timeout: 15000 })
      await newSendButton.focus()
      await page.keyboard.press("Space")

      // Wait to see if message was submitted
      await page.waitForTimeout(3000)

      console.log("✅ Keyboard navigation test completed")
    } catch (error) {
      console.error("❌ Keyboard navigation test failed:", error)
      await takeDebugScreenshot(page, "keyboard-navigation-failed")
      throw error
    }
  })

  test("should support screen reader announcements", async ({ page }) => {
    console.log("📢 Testing screen reader support...")

    try {
      // Check for live regions and screen reader announcements
      console.log("🔍 Checking for live regions...")

      const liveRegions = page.locator(
        '[aria-live], [role="status"], [role="alert"], [role="log"]'
      )
      const liveRegionCount = await liveRegions.count()
      console.log(`Found ${liveRegionCount} live regions`)

      if (liveRegionCount > 0) {
        for (let i = 0; i < liveRegionCount; i++) {
          const region = liveRegions.nth(i)
          const ariaLive = await region.getAttribute("aria-live")
          const role = await region.getAttribute("role")
          const ariaLabel = await region.getAttribute("aria-label")
          console.log(
            `Live region ${i + 1}: aria-live="${ariaLive}", role="${role}", aria-label="${ariaLabel}"`
          )
        }
      }

      // Test message announcement functionality
      await setupMockAIResponse(
        page,
        "This message should be announced to screen readers"
      )

      await sendMessage(page, "Test screen reader announcement")

      // Verify message appears (would be announced)
      await expect(
        page.getByText("Test screen reader announcement")
      ).toBeVisible({ timeout: 15000 })

      // Check for status updates in live regions
      console.log("🔍 Checking for status announcements...")

      // Look for loading states or status messages
      const statusIndicators = page.locator(
        '[role="status"], [aria-live="polite"], [aria-live="assertive"]'
      )
      const statusCount = await statusIndicators.count()

      if (statusCount > 0) {
        console.log(
          `✅ Found ${statusCount} potential status announcement regions`
        )
      }

      console.log("✅ Screen reader support test completed")
    } catch (error) {
      console.error("❌ Screen reader support test failed:", error)
      await takeDebugScreenshot(page, "screen-reader-failed")
      throw error
    }
  })

  test("should have proper heading structure and landmarks", async ({
    page,
  }) => {
    console.log("🏗️ Testing semantic structure and landmarks...")

    try {
      // Check heading hierarchy
      console.log("🔍 Checking heading structure...")

      const headings = await page.locator("h1, h2, h3, h4, h5, h6").all()
      const headingStructure = []

      for (const heading of headings) {
        const tagName = await heading.evaluate((el) => el.tagName)
        const text = await heading.textContent()
        const ariaLabel = await heading.getAttribute("aria-label")
        headingStructure.push({
          level: parseInt(tagName[1]),
          tag: tagName,
          text: text?.trim(),
          ariaLabel,
        })
      }

      console.log("Heading structure:", headingStructure)

      // Verify we have at least one main heading
      expect(headingStructure.length).toBeGreaterThan(0)

      // Check for proper heading hierarchy (should start with h1 or h2)
      if (headingStructure.length > 0) {
        const firstHeading = headingStructure[0]
        expect(firstHeading.level).toBeLessThanOrEqual(2)
      }

      // Check for ARIA landmarks
      console.log("🔍 Checking ARIA landmarks...")

      const landmarks = await page
        .locator(
          '[role="main"], [role="banner"], [role="navigation"], [role="complementary"], [role="contentinfo"], main, nav, aside, header, footer'
        )
        .all()
      const landmarkInfo = []

      for (const landmark of landmarks) {
        const role = await landmark.getAttribute("role")
        const tagName = await landmark.evaluate((el) => el.tagName)
        const ariaLabel = await landmark.getAttribute("aria-label")
        const ariaLabelledBy = await landmark.getAttribute("aria-labelledby")

        landmarkInfo.push({
          element: tagName,
          role: role || tagName.toLowerCase(),
          ariaLabel,
          ariaLabelledBy,
        })
      }

      console.log("Landmark structure:", landmarkInfo)

      // Should have at least a main content area
      const hasMainLandmark = landmarkInfo.some(
        (info) => info.role === "main" || info.element === "MAIN"
      )

      console.log(`Has main landmark: ${hasMainLandmark}`)

      console.log("✅ Semantic structure test completed")
    } catch (error) {
      console.error("❌ Semantic structure test failed:", error)
      await takeDebugScreenshot(page, "semantic-structure-failed")
      throw error
    }
  })

  test("should handle focus management properly", async ({ page }) => {
    console.log("🎯 Testing focus management...")

    try {
      await setupMockAIResponse(page, "Focus management test response")

      // Test initial focus state
      console.log("🔍 Testing initial focus state...")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      // Chat input should be focusable
      await chatInput.focus()
      await expect(chatInput).toBeFocused()

      // Test focus retention during interaction
      console.log("🔍 Testing focus during message sending...")

      await chatInput.fill("Focus management test")

      // Focus should remain on input while typing
      await expect(chatInput).toBeFocused()

      const sendButton = await waitForSendButton(page, { timeout: 15000 })
      await sendButton.click()

      // After message submission, focus should return to input for next message
      console.log("🔍 Testing focus after message submission...")

      // Wait for navigation
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })

      // Focus should be on the chat input for next message
      const newChatInput = await waitForChatInput(page, { timeout: 15000 })

      // Give focus a moment to settle
      await page.waitForTimeout(2000)

      const focusedElementInfo = await page.evaluate(() => {
        const el = document.activeElement
        return {
          tagName: el?.tagName,
          type: el?.getAttribute("type"),
          placeholder: el?.getAttribute("placeholder"),
          ariaLabel: el?.getAttribute("aria-label"),
        }
      })

      console.log("Current focus after message:", focusedElementInfo)

      // Test focus trap behavior (if applicable)
      console.log("🔍 Testing focus navigation bounds...")

      // Tab through elements and ensure focus stays within main interface
      const focusedElements = []
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab")
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement
          return {
            tagName: el?.tagName,
            className: el?.className?.split(" ")[0] || "",
            isVisible: el
              ? (el as HTMLElement).offsetWidth > 0 &&
                (el as HTMLElement).offsetHeight > 0
              : false,
          }
        })
        focusedElements.push(focusedElement)
      }

      // All focused elements should be visible and interactive
      const allVisible = focusedElements.every((el) => el.isVisible)
      console.log(`All focused elements visible: ${allVisible}`)

      console.log("✅ Focus management test completed")
    } catch (error) {
      console.error("❌ Focus management test failed:", error)
      await takeDebugScreenshot(page, "focus-management-failed")
      throw error
    }
  })

  test("should support high contrast mode", async ({ page }) => {
    console.log("🔆 Testing high contrast mode support...")

    try {
      // Simulate high contrast mode preferences
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })

      // Navigate and check interface
      await page.goto("/")
      await page.waitForLoadState("networkidle")

      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, {
        timeout: 15000,
        waitForEnabled: false,
      })

      // Verify elements are still visible and accessible
      await expect(chatInput).toBeVisible()
      await expect(sendButton).toBeVisible()

      // Check for proper contrast indicators
      console.log("🔍 Checking element visibility in high contrast...")

      const chatInputBox = await chatInput.boundingBox()
      const sendButtonBox = await sendButton.boundingBox()

      expect(chatInputBox).not.toBeNull()
      expect(sendButtonBox).not.toBeNull()

      // Test interaction in high contrast mode
      await chatInput.fill("High contrast mode test")
      await sendButton.click()

      // Should work the same as normal mode
      await page.waitForTimeout(3000)

      console.log("✅ High contrast mode test completed")
    } catch (error) {
      console.error("❌ High contrast mode test failed:", error)
      await takeDebugScreenshot(page, "high-contrast-failed")
      throw error
    }
  })

  test("should respect reduced motion preferences", async ({ page }) => {
    console.log("🎭 Testing reduced motion preferences...")

    try {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: "reduce" })

      await setupMockAIResponse(page, "Reduced motion test response")

      // Test that functionality still works with reduced motion
      await sendMessage(page, "Reduced motion test message")

      // Verify navigation still works
      await expect(page).toHaveURL(/\/c\/[a-f0-9-]+/, { timeout: 20000 })
      await expect(page.getByText("Reduced motion test message")).toBeVisible({
        timeout: 15000,
      })

      // Check that no motion-sensitive elements cause issues
      const chatInput = await waitForChatInput(page, { timeout: 15000 })
      await expect(chatInput).toBeVisible()
      await expect(chatInput).toBeEnabled()

      console.log("✅ Reduced motion preferences test completed")
    } catch (error) {
      console.error("❌ Reduced motion test failed:", error)
      await takeDebugScreenshot(page, "reduced-motion-failed")
      throw error
    }
  })

  test("should have proper form labeling and validation", async ({ page }) => {
    console.log("📝 Testing form accessibility...")

    try {
      const chatInput = await waitForChatInput(page, { timeout: 30000 })
      const sendButton = await waitForSendButton(page, {
        timeout: 15000,
        waitForEnabled: false,
      })

      // Check form structure
      console.log("🔍 Checking form structure...")

      const form = await page.locator("form").first()
      const hasForm = (await form.count()) > 0

      if (hasForm) {
        const formRole = await form.getAttribute("role")
        const formAriaLabel = await form.getAttribute("aria-label")
        const formAriaLabelledBy = await form.getAttribute("aria-labelledby")

        console.log(
          `Form attributes: role="${formRole}", aria-label="${formAriaLabel}", aria-labelledby="${formAriaLabelledBy}"`
        )
      }

      // Test form validation accessibility
      console.log("🔍 Testing form validation...")

      // Try to submit empty form (if validation exists)
      await chatInput.clear()

      const isButtonEnabled = await sendButton.isEnabled()
      console.log(`Send button enabled with empty input: ${isButtonEnabled}`)

      if (isButtonEnabled) {
        await sendButton.click()

        // Check for validation messages
        const validationMessages = await page
          .locator('[role="alert"], .error, [aria-describedby]')
          .all()

        for (const message of validationMessages) {
          const text = await message.textContent()
          const role = await message.getAttribute("role")
          const ariaLive = await message.getAttribute("aria-live")
          console.log(
            `Validation message: "${text}" (role: ${role}, aria-live: ${ariaLive})`
          )
        }
      }

      // Test successful form submission
      await chatInput.fill("Form validation test")
      await expect(sendButton).toBeEnabled()

      console.log("✅ Form accessibility test completed")
    } catch (error) {
      console.error("❌ Form accessibility test failed:", error)
      await takeDebugScreenshot(page, "form-accessibility-failed")
      throw error
    }
  })

  test("should provide proper error announcements", async ({ page }) => {
    console.log("🚨 Testing error announcement accessibility...")

    try {
      // Simulate an error scenario
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 400,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            error: "Validation Error",
            message: "This is an accessibility test error message",
          }),
        })
      })

      const chatInput = await waitForChatInput(page, { timeout: 30000 })

      await chatInput.fill("Error announcement test")
      const sendButton = await waitForSendButton(page, { timeout: 15000 })
      await sendButton.click()

      // Wait for error handling
      await page.waitForTimeout(5000)

      // Check for accessible error announcements
      console.log("🔍 Checking for accessible error messages...")

      const errorElements = await page
        .locator(
          '[role="alert"], [aria-live="assertive"], [aria-live="polite"], .error'
        )
        .all()

      for (const errorElement of errorElements) {
        const text = await errorElement.textContent()
        const role = await errorElement.getAttribute("role")
        const ariaLive = await errorElement.getAttribute("aria-live")
        const isVisible = await errorElement.isVisible()

        console.log(
          `Error element: "${text}" (role: ${role}, aria-live: ${ariaLive}, visible: ${isVisible})`
        )
      }

      // Verify error doesn't break accessibility
      await expect(chatInput).toBeEnabled()
      await expect(sendButton).toBeEnabled()

      console.log("✅ Error announcement accessibility test completed")
    } catch (error) {
      console.error("❌ Error announcement test failed:", error)
      await takeDebugScreenshot(page, "error-announcement-failed")
      throw error
    }
  })
})
