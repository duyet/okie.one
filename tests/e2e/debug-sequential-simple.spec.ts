import { expect, test } from "@playwright/test"

/**
 * Simple debug test for Sequential Thinking MCP
 */
test.describe("Debug Sequential Thinking MCP - Simple", () => {
  test("should test Sequential Thinking MCP with proper selectors", async ({
    page,
  }) => {
    console.log("🧪 Starting simple Sequential Thinking MCP debug test...")

    // Capture network requests
    const chatRequests: any[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/chat")) {
        const postData = request.postData()
        chatRequests.push({
          url: request.url(),
          method: request.method(),
          postData: postData ? JSON.parse(postData) : undefined,
        })
        console.log("📤 Chat API Request captured")
      }
    })

    // Capture responses
    page.on("response", async (response) => {
      if (response.url().includes("/api/chat")) {
        console.log("📥 Chat API Response:", response.status())
      }
    })

    // Go to home page
    await page.goto("http://localhost:3002")
    console.log("🌐 Navigated to home page")

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("What's on your mind?")
    console.log("✅ Page loaded successfully")

    // Find think button
    const thinkButton = page.getByTestId("think-button")
    await expect(thinkButton).toBeVisible()

    const buttonText = await thinkButton.textContent()
    console.log("🧠 Think button text:", buttonText)

    // Click to enable Sequential Thinking
    await thinkButton.click()
    console.log("🖱️ Clicked Sequential Thinking MCP button")

    // Wait a moment for state update
    await page.waitForTimeout(500)

    // Find the correct input field
    const inputField = page.locator('textarea[placeholder*="Ask"]')
    await expect(inputField).toBeVisible()
    console.log("✅ Found input field")

    // Type message
    const testMessage = "What is 2+2? Use sequential thinking."
    await inputField.fill(testMessage)
    console.log("📝 Entered message:", testMessage)

    // Find and click send button
    const sendButton = page.getByTestId("send-button")
    await expect(sendButton).toBeVisible()
    await sendButton.click()
    console.log("📤 Clicked send button")

    // Wait for navigation to chat page
    try {
      await page.waitForURL(/\/c\/[a-f0-9-]+/, { timeout: 10000 })
      console.log("🌐 Successfully navigated to chat page:", page.url())
    } catch (error) {
      console.log("⚠️ Navigation timeout or failed")
    }

    // Wait a bit for API request
    await page.waitForTimeout(2000)

    // Analyze what we captured
    console.log("\n📊 Analysis:")
    console.log("Chat requests captured:", chatRequests.length)

    for (const request of chatRequests) {
      console.log("\n📤 Request details:")
      console.log("  Model:", request.postData?.model)
      console.log("  Thinking Mode:", request.postData?.thinkingMode)
      console.log("  Tools:", JSON.stringify(request.postData?.tools, null, 2))
      console.log("  Enable Think:", request.postData?.enableThink)
      console.log("  Messages count:", request.postData?.messages?.length)
    }

    // Check if Sequential Thinking was configured
    const hasSequentialThinking = chatRequests.some(
      (req) =>
        req.postData?.thinkingMode === "sequential" ||
        req.postData?.tools?.some(
          (tool: any) =>
            tool.type === "mcp" && tool.name === "server-sequential-thinking"
        )
    )

    console.log("\n🎯 Results:")
    console.log("- Sequential Thinking configured:", hasSequentialThinking)
    console.log("- Total chat requests:", chatRequests.length)

    // Basic assertions
    expect(chatRequests.length).toBeGreaterThan(0)
    expect(hasSequentialThinking).toBe(true)

    console.log("✅ Simple debug test completed")
  })
})
