import { expect, test } from "@playwright/test"

test.describe("Guest User Chat", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and localStorage to ensure we start as a guest
    await context.clearCookies()
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test("should allow guest users to send chat messages", async ({ page }) => {
    await page.goto("/")

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle")

    // Check if we're a guest user by looking for guest indicators
    const userMenu = page.locator('[aria-label="User menu"]')

    // If there's a user menu, click it to see if we're logged in
    if (await userMenu.isVisible()) {
      await userMenu.click()
      const signInButton = page.locator('text="Sign in"')
      if (await signInButton.isVisible()) {
        // Close the menu
        await page.keyboard.press("Escape")
      }
    }

    // Find the chat input - looking for the textarea with "Ask" placeholder
    const chatInput = page.locator('textarea[placeholder*="Ask"]').first()

    // Wait for the chat input to be visible and enabled
    await expect(chatInput).toBeVisible({ timeout: 10000 })
    await expect(chatInput).toBeEnabled()

    // Type a test message
    const testMessage = "Hello, I am a guest user testing the chat!"
    await chatInput.fill(testMessage)

    // Submit the message
    // Try multiple ways to submit
    const sendButton = page.locator('button[aria-label="Send message"]')

    // Wait for send button to be visible and enabled
    await expect(sendButton).toBeVisible({ timeout: 5000 })
    await expect(sendButton).toBeEnabled()

    // Click the send button
    await sendButton.click()

    // Wait for possible navigation to /c/[chatId]
    await page.waitForLoadState("networkidle", { timeout: 10000 })

    // Check if we navigated to a chat page
    const currentUrl = page.url()
    const isOnChatPage = currentUrl.includes("/c/")
    console.log("Current URL:", currentUrl, "Is on chat page:", isOnChatPage)

    // Wait for the message to appear in the chat
    // Look for the message in various possible containers
    const messageLocator = page.locator(`text="${testMessage}"`)
    await expect(messageLocator).toBeVisible({ timeout: 30000 })

    // Check that there are no error messages
    const errorMessages = page.locator(
      "text=/error|failed|limit|unauthorized/i"
    )
    const errorCount = await errorMessages.count()

    // If there are error messages, check if they're actual errors
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent()
        // Ignore if it's part of the UI text and not an actual error
        if (
          errorText &&
          (errorText.toLowerCase().includes("daily message limit") ||
            errorText.toLowerCase().includes("authentication required") ||
            errorText.toLowerCase().includes("failed to send"))
        ) {
          throw new Error(`Chat failed with error: ${errorText}`)
        }
      }
    }

    // Verify that the message was sent and there's some response activity
    // Guest users should be able to send messages even if they don't get a response
    // (due to API key issues, rate limits, etc.)

    // Wait a bit for any response or error
    await page.waitForTimeout(3000)

    // Check if there's an error message about limits or authentication
    const limitError = page.locator("text=/daily message limit|rate limit/i")
    const hasLimitError = await limitError.isVisible().catch(() => false)

    if (hasLimitError) {
      // This is expected for guest users who hit the limit
      const errorText = await limitError.textContent()
      console.log("Guest user hit rate limit (expected):", errorText)
    } else {
      // Check if there's any AI response or activity
      const responseIndicators = [
        page.locator("text=/typing|generating|thinking/i"),
        page.locator('[data-role="assistant-message"]'),
        page.locator('[class*="assistant"]').filter({ hasText: /\w+/ }),
        // Look for any new message after our test message
        page
          .locator(`text="${testMessage}"`)
          .locator("xpath=following-sibling::*"),
      ]

      let responseFound = false
      for (const indicator of responseIndicators) {
        if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
          responseFound = true
          break
        }
      }

      // For guest users, we mainly care that they can send messages without crashing
      // Response is optional depending on API configuration
      console.log("Response found:", responseFound)
    }

    // The key test is that guest users can send messages without authentication errors
    expect(messageLocator).toBeVisible()
  })

  test("should persist guest user across page reloads", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Get the guest user ID from localStorage
    const guestIdBefore = await page.evaluate(() => {
      return (
        localStorage.getItem("guest-user-id") ||
        localStorage.getItem("fallback-guest-id") ||
        localStorage.getItem("guestUserId")
      )
    })

    // Reload the page
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Check that the guest ID persists
    const guestIdAfter = await page.evaluate(() => {
      return (
        localStorage.getItem("guest-user-id") ||
        localStorage.getItem("fallback-guest-id") ||
        localStorage.getItem("guestUserId")
      )
    })

    expect(guestIdAfter).toBeTruthy()
    expect(guestIdAfter).toBe(guestIdBefore)
  })

  test("should not show authentication errors for guest users", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Monitor console for errors
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    // Try to send a message
    const chatInput = page.locator('textarea[placeholder*="Ask"]').first()
    await chatInput.fill("Test message")

    const sendButton = page.locator('button[aria-label="Send message"]')
    await expect(sendButton).toBeVisible({ timeout: 5000 })
    await sendButton.click()

    // Wait a bit for any errors to appear
    await page.waitForTimeout(2000)

    // Check that there are no authentication-related console errors
    const authErrors = consoleErrors.filter(
      (error) =>
        error.toLowerCase().includes("auth") ||
        error.toLowerCase().includes("foreign key") ||
        error.toLowerCase().includes("constraint") ||
        error.toLowerCase().includes("unauthorized")
    )

    expect(authErrors).toHaveLength(0)

    // Check that there are no visible authentication error messages
    const authErrorMessages = page.locator(
      "text=/authentication required|sign in required|login required/i"
    )
    await expect(authErrorMessages).not.toBeVisible()
  })
})
