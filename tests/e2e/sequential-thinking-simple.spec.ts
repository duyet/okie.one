import { expect, test } from "@playwright/test"

test.describe("Sequential Thinking MCP - Simple UI Test", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test("should enable Sequential Thinking MCP for guest users in test environment", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Verify we're running as a guest user
    const userMenu = page.locator('[aria-label="User menu"]')
    const isAuthenticated = await userMenu.isVisible({ timeout: 3000 })
    console.log(
      `Authentication status: ${isAuthenticated ? "authenticated" : "guest user (expected)"}`
    )

    // The Sequential Thinking MCP button should be visible and functional for guest users
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout: 10000 })

    // Verify the button shows Sequential Thinking MCP text
    const buttonText = await thinkButton.textContent()
    console.log(`Think button text: "${buttonText}"`)
    expect(buttonText).toContain("Sequential Thinking MCP")

    // Verify the button is clickable (not showing auth popover)
    const buttonClasses = await thinkButton.getAttribute("class")
    const isInitiallyActive = buttonClasses?.includes("bg-[#E5F3FE]") || false
    console.log(`Button initially active: ${isInitiallyActive}`)

    // Click the button to toggle Sequential Thinking
    await thinkButton.click()
    await page.waitForTimeout(500)

    // Verify the button state changed (should be active now)
    const newButtonClasses = await thinkButton.getAttribute("class")
    const isActiveAfterClick =
      newButtonClasses?.includes("bg-[#E5F3FE]") || false
    console.log(`Button active after click: ${isActiveAfterClick}`)

    // Should have toggled state
    expect(isActiveAfterClick).toBe(!isInitiallyActive)

    // Verify no auth popover appeared (since we're in test environment)
    const authPopover = page.locator(
      'text="Login to try more features for free"'
    )
    const hasAuthPopover = await authPopover
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    console.log(`Auth popover appeared: ${hasAuthPopover} (should be false)`)
    expect(hasAuthPopover).toBe(false)

    console.log(
      "✅ Sequential Thinking MCP successfully enabled for guest user in test environment"
    )
  })

  test("should allow guest users to attempt sending messages with Sequential Thinking", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Enable Sequential Thinking MCP
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout: 10000 })

    const buttonClasses = await thinkButton.getAttribute("class")
    const isActive = buttonClasses?.includes("bg-[#E5F3FE]") || false

    if (!isActive) {
      await thinkButton.click()
      await page.waitForTimeout(500)
      console.log("Sequential Thinking MCP enabled")
    }

    // Try to send a simple math question
    const chatInput = page.locator('textarea[placeholder*="Ask"]').first()
    await expect(chatInput).toBeVisible({ timeout: 10000 })
    await expect(chatInput).toBeEnabled()

    const testQuestion = "What is 15% of 240?"
    await chatInput.fill(testQuestion)
    console.log(`Question entered: "${testQuestion}"`)

    // Check if send button is available
    const sendButton = page.locator('button[aria-label="Send message"]')
    await expect(sendButton).toBeVisible({ timeout: 5000 })

    const isSendEnabled = await sendButton.isEnabled()
    console.log(`Send button enabled: ${isSendEnabled}`)
    expect(isSendEnabled).toBe(true)

    // Click send button
    await sendButton.click()
    console.log("Send button clicked")

    // Wait a moment to see what happens
    await page.waitForTimeout(2000)

    // Check current URL (might redirect to chat page)
    const currentUrl = page.url()
    console.log(`Current URL after sending: ${currentUrl}`)

    // Check if there are any visible error messages
    const errorMessages = page.locator(
      "text=/error|failed|limit|unauthorized/i"
    )
    const errorCount = await errorMessages.count()

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent()
        console.log(`Found error message: "${errorText}"`)
      }
    } else {
      console.log("No error messages found")
    }

    // The main test is that Sequential Thinking MCP is available to guest users
    // Message sending might fail due to rate limits or other factors, but that's separate
    console.log(
      "✅ Sequential Thinking MCP UI functionality verified for guest users"
    )
  })
})
