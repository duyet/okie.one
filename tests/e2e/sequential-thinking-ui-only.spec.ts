import { expect, test } from "@playwright/test"

test.describe("Sequential Thinking MCP - UI Only Tests", () => {
  test("Sequential Thinking button appears and can be toggled", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/")

    // Wait for page to be ready
    await expect(page.locator("h1")).toContainText("What's on your mind?")

    // Find and verify think button exists
    const thinkButton = page.getByTestId("think-button")
    await expect(thinkButton).toBeVisible()

    // Verify button text for non-reasoning models
    const buttonText = await thinkButton.textContent()
    expect(buttonText).toContain("Sequential Thinking MCP")

    // Click to enable Sequential Thinking
    await thinkButton.click()

    // Verify button has active state (blue background)
    const buttonClasses = await thinkButton.getAttribute("class")
    expect(buttonClasses).toContain("bg-[#E5F3FE]")

    // Click again to disable
    await thinkButton.click()

    // Verify button returns to inactive state
    const updatedClasses = await thinkButton.getAttribute("class")
    expect(updatedClasses).not.toContain("bg-[#E5F3FE]")
  })
})
