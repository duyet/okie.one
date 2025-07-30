import { expect, test } from "@playwright/test"

test.describe("Sequential Thinking MCP - Basic Functionality", () => {
  test("Sequential Thinking MCP button appears and can be toggled", async ({
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

  test("Sequential Thinking MCP configuration is sent with chat request", async ({
    page,
  }) => {
    // Capture network requests
    let chatRequestSent = false
    let requestBody: any = null

    page.on("request", (request) => {
      if (request.url().includes("/api/chat") && request.method() === "POST") {
        const postData = request.postData()
        if (postData) {
          requestBody = JSON.parse(postData)
          chatRequestSent = true
        }
      }
    })

    // Navigate to home page
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("What's on your mind?")

    // Enable Sequential Thinking
    const thinkButton = page.getByTestId("think-button")
    await thinkButton.click()

    // Verify button has active state
    const buttonClasses = await thinkButton.getAttribute("class")
    expect(buttonClasses).toContain("bg-[#E5F3FE]")

    // Enter a message
    const inputField = page.locator('textarea[placeholder*="Ask"]')
    await inputField.fill("Test message")

    // Send the message
    const sendButton = page.getByLabel("Send message")
    await sendButton.click()

    // Wait for the request to be sent
    await page.waitForTimeout(1000)

    // Verify the request was sent with Sequential Thinking configuration
    expect(chatRequestSent).toBe(true)
    expect(requestBody).toBeTruthy()
    expect(requestBody.thinkingMode).toBe("sequential")

    // Verify MCP tools are included
    if (requestBody.tools) {
      const mcpTool = requestBody.tools.find(
        (tool: any) =>
          tool.type === "mcp" && tool.name === "server-sequential-thinking"
      )
      expect(mcpTool).toBeTruthy()
    }
  })
})
