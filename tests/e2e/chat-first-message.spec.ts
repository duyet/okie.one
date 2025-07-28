import { expect, test } from "@playwright/test"

test.describe("First Message from Home Page", () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto("/")

    // Wait for the page to be ready
    await expect(page.getByText("What's on your mind?")).toBeVisible()
  })

  test("should display first message after sending from home page", async ({
    page,
  }) => {
    // Enable console log monitoring
    const consoleLogs: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "log") {
        consoleLogs.push(msg.text())
      }
    })

    // Type a message
    const input = page.getByPlaceholder("Message Okie...")
    await input.fill("hello")

    // Send the message
    await page.getByRole("button", { name: "Send" }).click()

    // Wait for navigation to chat page
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/, { timeout: 5000 })

    // The user message should be visible
    await expect(page.getByText("hello").first()).toBeVisible({ timeout: 5000 })

    // Wait for AI response
    await expect(page.getByText(/Hello|Hi|Hey/i)).toBeVisible({
      timeout: 30000,
    })

    // Both messages should remain visible
    await expect(page.getByText("hello").first()).toBeVisible()

    // Analyze console logs for debugging
    const messageStateChanges = consoleLogs.filter(
      (log) =>
        log.includes("Raw messages changed") ||
        log.includes("initialMessages changed")
    )

    console.log("Message state changes:", messageStateChanges)
  })

  test("should preserve messages during navigation", async ({ page }) => {
    // Monitor network requests
    const requests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        requests.push(`${request.method()} ${request.url()}`)
      }
    })

    // Send message
    const input = page.getByPlaceholder("Message Okie...")
    await input.fill("test message for persistence")
    await page.getByRole("button", { name: "Send" }).click()

    // Wait for chat page
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/)

    // Message should be visible
    await expect(page.getByText("test message for persistence")).toBeVisible()

    // Refresh the page to test persistence
    await page.reload()

    // Message should still be visible after reload
    await expect(page.getByText("test message for persistence")).toBeVisible({
      timeout: 5000,
    })

    console.log("API requests made:", requests)
  })

  test("should handle rapid message submission", async ({ page }) => {
    // Type and send message quickly
    const input = page.getByPlaceholder("Message Okie...")
    await input.fill("rapid test message")

    // Send immediately
    await Promise.all([
      page.waitForURL(/\/c\/[a-zA-Z0-9-]+/),
      page.getByRole("button", { name: "Send" }).click(),
    ])

    // Should see the message
    await expect(page.getByText("rapid test message")).toBeVisible({
      timeout: 5000,
    })
  })

  test("should maintain message state with slow database", async ({ page }) => {
    // Intercept and delay database calls
    await page.route("**/api/messages*", async (route) => {
      // Delay database response
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue()
    })

    // Send message
    const input = page.getByPlaceholder("Message Okie...")
    await input.fill("testing with slow db")
    await page.getByRole("button", { name: "Send" }).click()

    // Wait for navigation
    await page.waitForURL(/\/c\/[a-zA-Z0-9-]+/)

    // Message should still be visible despite slow DB
    await expect(page.getByText("testing with slow db")).toBeVisible({
      timeout: 10000,
    })
  })
})
