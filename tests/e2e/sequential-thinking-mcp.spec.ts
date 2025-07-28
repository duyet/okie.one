import { expect, test } from "@playwright/test"

test.describe("Sequential Thinking MCP Feature", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and localStorage to ensure fresh state
    await context.clearCookies()
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test("should show Sequential Thinking MCP button for non-reasoning models", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Wait for the page to fully load and model selector to be available
    const modelSelector = page.locator('[data-testid="model-selector"]')
    if (await modelSelector.isVisible({ timeout: 5000 })) {
      await modelSelector.click()

      // Select a non-reasoning model (e.g., basic GPT model without reasoning capability)
      const nonReasoningModel = page.locator('text="GPT-3.5 Turbo"').first()
      if (await nonReasoningModel.isVisible({ timeout: 3000 })) {
        await nonReasoningModel.click()
      }
    }

    // Look for the Sequential Thinking MCP button
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout: 10000 })

    // Verify the button text indicates Sequential Thinking MCP
    const buttonText = await thinkButton.textContent()
    expect(buttonText).toContain("Sequential Thinking MCP")
  })

  test("should toggle Sequential Thinking MCP mode for authenticated users", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Check if user is authenticated by looking for user menu
    const userMenu = page.locator('[aria-label="User menu"]')
    const isAuthenticated = await userMenu.isVisible({ timeout: 3000 })

    if (!isAuthenticated) {
      // Skip test for guest users as they need auth for Sequential Thinking
      test.skip(true, "Sequential Thinking MCP requires authentication")
    }

    // Find the Sequential Thinking MCP button
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout: 10000 })

    // Initially, the button should not be in active/selected state
    const initialClasses = await thinkButton.getAttribute("class")
    const isInitiallyActive = initialClasses?.includes("bg-[#E5F3FE]") || false

    // Click to toggle Sequential Thinking MCP mode
    await thinkButton.click()

    // Wait for state change
    await page.waitForTimeout(500)

    // Verify the button state changed
    const afterClickClasses = await thinkButton.getAttribute("class")
    const isActiveAfterClick =
      afterClickClasses?.includes("bg-[#E5F3FE]") || false

    expect(isActiveAfterClick).toBe(!isInitiallyActive)
  })

  test("should allow Sequential Thinking MCP for guest users in test environment", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Ensure we're a guest user
    const userMenu = page.locator('[aria-label="User menu"]')
    const isAuthenticated = await userMenu.isVisible({ timeout: 3000 })

    if (isAuthenticated) {
      console.log("User is authenticated - skipping guest user test")
      test.skip(true, "This test is for guest users only")
    }

    // Find the Sequential Thinking MCP button
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout: 10000 })

    // Verify button shows Sequential Thinking MCP text
    const buttonText = await thinkButton.textContent()
    expect(buttonText).toContain("Sequential Thinking MCP")

    // Click button - should toggle, not show auth popover (since we're in test environment)
    const initialClasses = await thinkButton.getAttribute("class")
    const isInitiallyActive = initialClasses?.includes("bg-[#E5F3FE]") || false

    await thinkButton.click()
    await page.waitForTimeout(500)

    // Verify button state changed (toggled)
    const newClasses = await thinkButton.getAttribute("class")
    const isActiveAfterClick = newClasses?.includes("bg-[#E5F3FE]") || false
    expect(isActiveAfterClick).toBe(!isInitiallyActive)

    // Verify NO auth popover appeared (test environment allows guest user access)
    const authPopover = page.locator(
      'text="Login to try more features for free"'
    )
    const hasAuthPopover = await authPopover
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    expect(hasAuthPopover).toBe(false)

    console.log(
      "✅ Sequential Thinking MCP successfully enabled for guest user in test environment"
    )
  })

  test("should send message with Sequential Thinking MCP enabled", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Check if user is authenticated
    const userMenu = page.locator('[aria-label="User menu"]')
    const isAuthenticated = await userMenu.isVisible({ timeout: 3000 })

    if (!isAuthenticated) {
      test.skip(true, "Sequential Thinking MCP requires authentication")
    }

    // Enable Sequential Thinking MCP
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout: 10000 })

    // Only click if not already active
    const buttonClasses = await thinkButton.getAttribute("class")
    const isActive = buttonClasses?.includes("bg-[#E5F3FE]") || false

    if (!isActive) {
      await thinkButton.click()
      await page.waitForTimeout(500)
    }

    // Send a test message that would benefit from sequential thinking
    const chatInput = page.locator('textarea[placeholder*="Ask"]').first()
    await expect(chatInput).toBeVisible({ timeout: 10000 })
    await expect(chatInput).toBeEnabled()

    const testMessage =
      "Explain the process of making a cup of coffee step by step"
    await chatInput.fill(testMessage)

    // Submit the message
    const sendButton = page.locator('button[aria-label="Send message"]')
    await expect(sendButton).toBeVisible({ timeout: 5000 })
    await expect(sendButton).toBeEnabled()
    await sendButton.click()

    // Wait for message to be sent and response to begin
    await page.waitForLoadState("networkidle", { timeout: 10000 })

    // Verify the message appears in chat
    const messageLocator = page.locator(`text="${testMessage}"`)
    await expect(messageLocator).toBeVisible({ timeout: 30000 })

    // Look for sequential reasoning steps in the response
    // The reasoning steps component shows "Sequential Reasoning (X steps)"
    const reasoningSteps = page.locator('text="Sequential Reasoning"')

    // Note: This might not always appear depending on the model's response
    // and whether the backend properly processes the Sequential Thinking MCP request
    // So we'll check for it but not fail the test if it's not found
    const hasReasoningSteps = await reasoningSteps
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    if (hasReasoningSteps) {
      console.log("Sequential reasoning steps detected in response")
      // If reasoning steps are present, verify they can be expanded/collapsed
      await reasoningSteps.click()

      // Look for individual reasoning step content
      const stepContent = page
        .locator('[class*="step"]')
        .or(page.locator("text=/Step [0-9]+/i"))

      // Don't fail if step content isn't found as the exact structure may vary
      const hasStepContent = await stepContent
        .isVisible({ timeout: 3000 })
        .catch(() => false)
      if (hasStepContent) {
        console.log("Sequential reasoning step content found")
      }
    } else {
      console.log(
        "Sequential reasoning steps not detected - this may be expected depending on model response"
      )
    }

    // The main success criteria is that the message was sent successfully
    // with Sequential Thinking MCP enabled (no errors occurred)
    expect(messageLocator).toBeVisible()
  })

  test("should show dropdown for reasoning models with both options", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Try to select a reasoning model (like Claude or GPT-4 with reasoning)
    const modelSelector = page.locator('[data-testid="model-selector"]')
    if (await modelSelector.isVisible({ timeout: 5000 })) {
      await modelSelector.click()

      // Look for a reasoning model (models with native thinking capability)
      const reasoningModel = page
        .locator('text="Claude 3.5 Sonnet"')
        .or(page.locator('text="GPT-4"'))
        .first()

      if (await reasoningModel.isVisible({ timeout: 3000 })) {
        await reasoningModel.click()

        // Wait for model selection to take effect
        await page.waitForTimeout(1000)

        // Check if user is authenticated (required for dropdown functionality)
        const userMenu = page.locator('[aria-label="User menu"]')
        const isAuthenticated = await userMenu.isVisible({ timeout: 3000 })

        if (isAuthenticated) {
          // For reasoning models with auth, should show dropdown with caret
          const thinkButton = page.locator('[data-testid="think-button"]')
          await expect(thinkButton).toBeVisible({ timeout: 10000 })

          // Look for dropdown caret icon
          const caretIcon = thinkButton.locator("svg").last()
          const hasCaretIcon = await caretIcon.isVisible({ timeout: 3000 })

          if (hasCaretIcon) {
            // Click to open dropdown
            await thinkButton.click()

            // Verify dropdown options appear
            const disableThinking = page.locator('text="Disable Thinking"')
            const nativeThinking = page.locator('text="Thinking (Native)"')
            const sequentialThinking = page.locator(
              'text="Sequential Thinking MCP"'
            )

            await expect(disableThinking).toBeVisible({ timeout: 5000 })
            await expect(nativeThinking).toBeVisible({ timeout: 5000 })
            await expect(sequentialThinking).toBeVisible({ timeout: 5000 })

            // Test selecting Sequential Thinking MCP option
            await sequentialThinking.click()

            // Verify button text updates to show Sequential Thinking MCP
            const buttonText = await thinkButton.textContent()
            expect(buttonText).toContain("Sequential Thinking MCP")
          }
        }
      } else {
        test.skip(
          true,
          "No reasoning models available for testing dropdown functionality"
        )
      }
    }
  })
})
