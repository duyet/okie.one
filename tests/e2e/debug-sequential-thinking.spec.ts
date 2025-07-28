import { expect, type Page, test } from "@playwright/test"

/**
 * Comprehensive E2E test to debug Sequential Thinking MCP issues
 * This test will capture all network requests, console logs, and UI interactions
 * to identify why Sequential Thinking MCP might not be working correctly.
 */
test.describe("Debug Sequential Thinking MCP", () => {
  let consoleLogs: string[] = []
  let networkRequests: {
    url: string
    method: string
    postData?: any
    response?: any
  }[] = []
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    consoleLogs = []
    networkRequests = []

    // Capture console logs
    page.on("console", (msg) => {
      const logMessage = `[${msg.type()}] ${msg.text()}`
      consoleLogs.push(logMessage)
      console.log("🔍 Console:", logMessage)
    })

    // Capture network requests
    page.on("request", (request) => {
      const postData = request.postData()
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        postData: postData ? JSON.parse(postData) : undefined,
      })

      if (request.url().includes("/api/chat")) {
        console.log("📤 API Request:", {
          url: request.url(),
          method: request.method(),
          postData: postData ? JSON.parse(postData) : undefined,
        })
      }
    })

    // Capture network responses
    page.on("response", async (response) => {
      if (response.url().includes("/api/chat")) {
        try {
          const responseText = await response.text()
          console.log("📥 API Response:", {
            url: response.url(),
            status: response.status(),
            responsePreview:
              responseText.substring(0, 500) +
              (responseText.length > 500 ? "..." : ""),
          })

          // Store response in corresponding request
          const requestIndex = networkRequests.findIndex(
            (req) =>
              req.url === response.url() &&
              req.method === response.request().method()
          )
          if (requestIndex !== -1) {
            networkRequests[requestIndex].response = {
              status: response.status(),
              body: responseText,
            }
          }
        } catch (error) {
          console.error("❌ Error capturing response:", error)
        }
      }
    })

    await page.goto("http://localhost:3002")
  })

  test("should debug Sequential Thinking MCP end-to-end flow", async () => {
    console.log("🧪 Starting Sequential Thinking MCP debug test...")

    // Step 1: Verify page load
    await expect(page.locator("h1")).toContainText("What's on your mind?")
    console.log("✅ Page loaded successfully")

    // Step 2: Find and examine the think button
    const thinkButton = page.getByTestId("think-button")
    await expect(thinkButton).toBeVisible()

    const thinkButtonText = await thinkButton.textContent()
    console.log("🧠 Think button text:", thinkButtonText)
    console.log(
      '🧠 Think button should show "Sequential Thinking MCP" for non-reasoning models'
    )

    // Step 3: Check if button shows Sequential Thinking MCP
    if (thinkButtonText?.includes("Sequential Thinking MCP")) {
      console.log("✅ Sequential Thinking MCP button detected")
    } else {
      console.log(
        '⚠️ Expected "Sequential Thinking MCP" button, got:',
        thinkButtonText
      )
    }

    // Step 4: Click the button to enable Sequential Thinking
    await thinkButton.click()
    console.log("🖱️ Clicked Sequential Thinking MCP button")

    // Check if button becomes active
    await page.waitForTimeout(500) // Wait for state update
    const isActive = await thinkButton.evaluate(
      (el) =>
        el.classList.contains("border-[#0091FF]/20") ||
        el.classList.contains("bg-[#E5F3FE]")
    )
    console.log("🎯 Button active state:", isActive)

    // Step 5: Enter a test question
    const testQuestion =
      "What is 25% of 80? Use sequential thinking to break this down step by step."
    const inputField = page.locator('textarea[placeholder*="Ask anything"]')
    await inputField.fill(testQuestion)
    console.log("📝 Entered test question:", testQuestion)

    // Step 6: Send the message and capture all network activity
    console.log("📤 Sending message...")
    const sendButton = page.getByTestId("send-button")
    await sendButton.click()

    // Wait for navigation to chat page
    await page.waitForURL(/\/c\/[a-f0-9-]+/, { timeout: 10000 })
    const currentUrl = page.url()
    console.log("🌐 Navigated to chat page:", currentUrl)

    // Step 7: Wait for AI response and capture streaming
    console.log("⏳ Waiting for AI response...")

    // Wait for message to appear in conversation
    const messageLocator = page.locator('[data-testid="message"]').first()
    try {
      await messageLocator.waitFor({ timeout: 30000 })
      console.log("✅ First message appeared")
    } catch (error) {
      console.log("⚠️ No message appeared within 30 seconds")
    }

    // Step 8: Look for reasoning steps or MCP tool calls
    await page.waitForTimeout(3000) // Wait for potential streaming to complete

    // Check for reasoning steps in the UI
    const reasoningSteps = page.locator(
      '[data-testid*="reasoning"], [class*="reasoning"]'
    )
    const reasoningCount = await reasoningSteps.count()
    console.log("🧠 Reasoning steps found in UI:", reasoningCount)

    // Check for any error messages
    const errorMessages = page.locator(
      '[role="alert"], .error, [class*="error"]'
    )
    const errorCount = await errorMessages.count()
    console.log("❌ Error messages found:", errorCount)

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent()
        console.log(`❌ Error ${i + 1}:`, errorText)
      }
    }

    // Step 9: Analyze captured network requests
    console.log("\n📊 Network Analysis:")
    const chatRequests = networkRequests.filter((req) =>
      req.url.includes("/api/chat")
    )
    console.log("🌐 Chat API requests:", chatRequests.length)

    for (const request of chatRequests) {
      console.log("\n📤 Chat Request Details:")
      console.log("  Method:", request.method)
      console.log("  URL:", request.url)

      if (request.postData) {
        console.log("  Post Data:")
        console.log("    Model:", request.postData.model)
        console.log("    Thinking Mode:", request.postData.thinkingMode)
        console.log(
          "    Tools:",
          JSON.stringify(request.postData.tools, null, 2)
        )
        console.log("    Messages Count:", request.postData.messages?.length)
        console.log("    Enable Think:", request.postData.enableThink)
        console.log("    Enable Search:", request.postData.enableSearch)
      }

      if (request.response) {
        console.log("  Response Status:", request.response.status)
        if (request.response.status !== 200) {
          console.log("  Response Body:", request.response.body)
        } else {
          console.log(
            "  Response Preview:",
            request.response.body.substring(0, 200) + "..."
          )
        }
      }
    }

    // Step 10: Analyze console logs for MCP-related activity
    console.log("\n📊 Console Log Analysis:")
    const mcpLogs = consoleLogs.filter(
      (log) =>
        log.includes("MCP") ||
        log.includes("sequentialthinking") ||
        log.includes("addReasoningStep") ||
        log.includes("🧠") ||
        log.includes("🔧")
    )
    console.log("🧠 MCP-related console logs:", mcpLogs.length)

    mcpLogs.forEach((log, index) => {
      console.log(`  ${index + 1}: ${log}`)
    })

    // Step 11: Check for tool invocation logs
    const toolLogs = consoleLogs.filter(
      (log) =>
        log.includes("Tool call") ||
        log.includes("tool invocation") ||
        log.includes("sequentialthinking")
    )
    console.log("🔧 Tool invocation logs:", toolLogs.length)

    toolLogs.forEach((log, index) => {
      console.log(`  ${index + 1}: ${log}`)
    })

    // Step 12: Final verification
    console.log("\n🔍 Final Analysis:")

    // Check if we got a successful response
    const hasSuccessfulResponse = chatRequests.some(
      (req) => req.response?.status === 200
    )
    console.log("✅ Successful API response:", hasSuccessfulResponse)

    // Check if Sequential Thinking was properly configured
    const hasSequentialThinking = chatRequests.some(
      (req) =>
        req.postData?.thinkingMode === "sequential" ||
        req.postData?.tools?.some(
          (tool: any) =>
            tool.type === "mcp" && tool.name === "server-sequential-thinking"
        )
    )
    console.log("🧠 Sequential Thinking configured:", hasSequentialThinking)

    // Check if we have any MCP-related activity
    const hasMCPActivity = mcpLogs.length > 0 || toolLogs.length > 0
    console.log("🔧 MCP activity detected:", hasMCPActivity)

    // Step 13: Take screenshot for visual debugging
    await page.screenshot({
      path: "tests/screenshots/debug-sequential-thinking.png",
      fullPage: true,
    })
    console.log(
      "📸 Screenshot saved to tests/screenshots/debug-sequential-thinking.png"
    )

    // Final assertions
    expect(hasSuccessfulResponse).toBe(true)
    expect(hasSequentialThinking).toBe(true)

    console.log("\n🎯 Debug Summary:")
    console.log("- UI loaded correctly:", true)
    console.log(
      "- Sequential Thinking button found:",
      thinkButtonText?.includes("Sequential Thinking MCP")
    )
    console.log("- Button activated:", isActive)
    console.log("- Message sent successfully:", hasSuccessfulResponse)
    console.log("- Sequential Thinking configured:", hasSequentialThinking)
    console.log("- MCP activity detected:", hasMCPActivity)
    console.log("- Error count:", errorCount)

    if (!hasMCPActivity) {
      console.log("\n⚠️  POTENTIAL ISSUE: No MCP activity detected!")
      console.log("This could indicate:")
      console.log("1. MCP tools are not being called by the AI model")
      console.log("2. Tool invocation is not being logged properly")
      console.log("3. Sequential Thinking MCP server is not responding")
    }
  })

  test.afterEach(async () => {
    // Save all captured data for further analysis
    const debugData = {
      consoleLogs,
      networkRequests,
      timestamp: new Date().toISOString(),
    }

    // You could save this to a file for detailed analysis
    console.log("\n📊 Debug session completed")
    console.log("Console logs captured:", consoleLogs.length)
    console.log("Network requests captured:", networkRequests.length)
  })
})
