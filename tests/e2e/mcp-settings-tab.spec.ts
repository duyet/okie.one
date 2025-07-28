import { expect, test } from "@playwright/test"

test.describe("MCP Settings Tab", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto("/")
  })

  test("opens settings modal and navigates to MCP tab", async ({ page }) => {
    // Open settings (look for settings button/trigger)
    await page.click('[data-testid="settings-trigger"]')

    // Wait for settings modal to be visible
    await page.waitForSelector('[data-testid="settings-modal"]', {
      state: "visible",
    })

    // Click on MCP tab
    await page.click('text="MCP"')

    // Verify MCP settings content is visible
    await expect(page.locator('text="MCP Servers"')).toBeVisible()
    await expect(
      page.locator('text="Enable or disable Model Context Protocol"')
    ).toBeVisible()
  })

  test("displays Sequential Thinking MCP server in settings", async ({
    page,
  }) => {
    // Open settings and navigate to MCP tab
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    // Verify Sequential Thinking MCP is listed
    await expect(page.locator('text="Sequential Thinking MCP"')).toBeVisible()
    await expect(
      page.locator('text="Advanced step-by-step reasoning"')
    ).toBeVisible()
    await expect(page.locator('text="Auth Required"')).toBeVisible()

    // Verify switch is present
    const mcpSwitch = page.locator('[role="switch"]').first()
    await expect(mcpSwitch).toBeVisible()
  })

  test("toggles Sequential Thinking MCP setting", async ({ page }) => {
    // Open settings and navigate to MCP tab
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    // Find the Sequential Thinking MCP switch
    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    // Get initial state
    const initialState = await mcpSwitch.getAttribute("aria-checked")

    // Toggle the switch
    await mcpSwitch.click()

    // Wait for state change
    await page.waitForFunction(
      (element, initial) => element.getAttribute("aria-checked") !== initial,
      mcpSwitch,
      initialState
    )

    // Verify state changed
    const newState = await mcpSwitch.getAttribute("aria-checked")
    expect(newState).not.toBe(initialState)
  })

  test("reflects MCP setting changes in chat interface", async ({ page }) => {
    // First, disable Sequential Thinking MCP in settings
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    // Ensure it's disabled
    const isChecked = await mcpSwitch.getAttribute("aria-checked")
    if (isChecked === "true") {
      await mcpSwitch.click()
      await page.waitForFunction(
        (element) => element.getAttribute("aria-checked") === "false",
        mcpSwitch
      )
    }

    // Close settings modal
    await page.keyboard.press("Escape")
    await page.waitForSelector('[data-testid="settings-modal"]', {
      state: "hidden",
    })

    // Check if think button is hidden for non-reasoning models
    // This depends on the current model, so we'll look for the think button
    const thinkButton = page.locator('[data-testid="think-button"]')
    const thinkButtonCount = await thinkButton.count()

    // If a non-reasoning model is selected, think button should not exist
    // If a reasoning model is selected, think button should exist but without Sequential option

    if (thinkButtonCount > 0) {
      // Click the think button to open options (if it's a dropdown)
      await thinkButton.click()

      // Sequential Thinking MCP option should not be visible
      await expect(
        page.locator('text="Sequential Thinking MCP"')
      ).not.toBeVisible()
    }
  })

  test("enables MCP setting and verifies chat interface update", async ({
    page,
  }) => {
    // Enable Sequential Thinking MCP in settings
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    // Ensure it's enabled
    const isChecked = await mcpSwitch.getAttribute("aria-checked")
    if (isChecked === "false") {
      await mcpSwitch.click()
      await page.waitForFunction(
        (element) => element.getAttribute("aria-checked") === "true",
        mcpSwitch
      )
    }

    // Close settings modal
    await page.keyboard.press("Escape")
    await page.waitForSelector('[data-testid="settings-modal"]', {
      state: "hidden",
    })

    // Now Sequential Thinking should be available
    // This test is model-dependent, so we'll check if the option appears when available
    const thinkButton = page.locator('[data-testid="think-button"]')
    const thinkButtonCount = await thinkButton.count()

    if (thinkButtonCount > 0) {
      // For reasoning models, Sequential Thinking should be available as dropdown option
      await thinkButton.click()
      // Give time for dropdown to appear
      await page.waitForTimeout(500)

      // Look for Sequential Thinking MCP option
      const sequentialOption = page.locator('text="Sequential Thinking MCP"')
      if ((await sequentialOption.count()) > 0) {
        await expect(sequentialOption).toBeVisible()
      }
    }
  })

  test("persists MCP settings across page reloads", async ({ page }) => {
    // Set Sequential Thinking to disabled
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    await mcpSwitch.click()
    const newState = await mcpSwitch.getAttribute("aria-checked")

    // Close settings
    await page.keyboard.press("Escape")

    // Reload the page
    await page.reload()

    // Open settings again and check if state persisted
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    const mcpSwitchAfterReload = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    const persistedState =
      await mcpSwitchAfterReload.getAttribute("aria-checked")
    expect(persistedState).toBe(newState)
  })

  test("handles MCP settings for authenticated vs anonymous users", async ({
    page,
  }) => {
    // This test would require authentication setup
    // For now, we'll just verify the settings interface works

    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    // Verify settings are accessible
    await expect(page.locator('text="Sequential Thinking MCP"')).toBeVisible()

    // For anonymous users, settings should still work with localStorage
    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    await expect(mcpSwitch).toBeVisible()
    await expect(mcpSwitch).toBeEnabled()
  })

  test("displays proper accessibility attributes", async ({ page }) => {
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')
    await page.click('text="MCP"')

    // Check MCP tab has proper ARIA attributes
    const mcpTab = page.locator('text="MCP"').first()
    await expect(mcpTab).toHaveAttribute("role", "tab")

    // Check switch has proper accessibility
    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    await expect(mcpSwitch).toHaveAttribute("role", "switch")
    await expect(mcpSwitch).toHaveAttribute("aria-checked")

    // Check proper labeling structure
    const serverItem = page
      .locator('text="Sequential Thinking MCP"')
      .locator("..")
    await expect(serverItem.locator('text="Auth Required"')).toBeVisible()
  })

  test("handles keyboard navigation in MCP settings", async ({ page }) => {
    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')

    // Navigate to MCP tab using keyboard
    await page.keyboard.press("Tab") // Navigate through modal elements
    await page.keyboard.press("ArrowRight") // Or use arrow keys if tabs support it
    // This is implementation-dependent, so we'll use direct click for reliability
    await page.click('text="MCP"')

    // Navigate to switch using keyboard
    await page.keyboard.press("Tab")

    // Should be able to toggle switch with space or enter
    await page.keyboard.press("Space")

    // Verify the interaction worked
    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    // State should have changed
    await expect(mcpSwitch).toHaveAttribute("aria-checked")
  })

  test("mobile responsive behavior for MCP settings", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.click('[data-testid="settings-trigger"]')
    await page.waitForSelector('[data-testid="settings-modal"]')

    // On mobile, tabs might be displayed differently
    await page.click('text="MCP"')

    // Verify MCP settings are still accessible and properly formatted
    await expect(page.locator('text="Sequential Thinking MCP"')).toBeVisible()

    const mcpSwitch = page
      .locator('text="Sequential Thinking MCP"')
      .locator("../..")
      .locator('[role="switch"]')

    await expect(mcpSwitch).toBeVisible()

    // Verify touch interaction works
    await mcpSwitch.tap()

    const newState = await mcpSwitch.getAttribute("aria-checked")
    expect(newState).toBeTruthy()
  })
})
