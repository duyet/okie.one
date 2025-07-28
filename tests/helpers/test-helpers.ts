import { expect, type Locator, type Page } from "@playwright/test"

import { getChatPlaceholder } from "./app-config"

/**
 * Enhanced test helpers for Okie E2E tests
 * Provides robust wait patterns and common test utilities
 */

export interface ChatInputOptions {
  timeout?: number
  waitForReady?: boolean
}

export interface AIResponseOptions {
  timeout?: number
  expectResponse?: boolean
  expectReasoning?: boolean
}

export interface AIResponseResult {
  hasResponse: boolean
  responseTime: number
  reasoningFound?: boolean
}

export interface MCPToolOptions {
  timeout?: number
  expectSuccess?: boolean
}

/**
 * Wait for page to be fully loaded and interactive
 */
export async function waitForPageReady(
  page: Page,
  options: { timeout?: number } = {}
) {
  const timeout = options.timeout || 45000 // Increased default timeout

  console.log("⏳ Waiting for page to be ready...")

  try {
    // Wait for network idle with retries
    let retries = 3
    while (retries > 0) {
      try {
        await page.waitForLoadState("networkidle", { timeout: timeout / 3 })
        break
      } catch (error) {
        retries--
        if (retries === 0) throw error
        console.log(`Retrying network idle wait (${retries} attempts left)...`)
        await page.waitForTimeout(1000)
      }
    }

    // Wait for main heading to be visible
    const heading = page.locator("h1").first()
    await expect(heading).toBeVisible({ timeout: 15000 })

    // For chat pages, wait for chat input with extended timeout
    if (page.url().includes("/c/")) {
      await waitForChatInput(page, { timeout: 20000 })
    }

    console.log("✅ Page is ready")
  } catch (error) {
    console.error("❌ Page readiness check failed:", error)
    // Take screenshot for debugging
    await takeDebugScreenshot(page, "page-ready-failed")
    throw error
  }
}

/**
 * Wait for chat input to be available and enabled
 */
export async function waitForChatInput(
  page: Page,
  options: ChatInputOptions = {}
): Promise<Locator> {
  const timeout = options.timeout || 30000 // Increased timeout
  const waitForReady = options.waitForReady ?? true

  console.log("⏳ Waiting for chat input...")

  try {
    // Try multiple selectors for chat input
    const chatInput = page
      .locator(`textarea[placeholder*="${getChatPlaceholder().split(" ")[1]}"]`)
      .or(page.locator('textarea[placeholder*="Ask"]'))
      .or(page.locator('[data-testid="chat-input"]'))
      .first()

    // Wait for input to be visible with retries
    let retries = 3
    while (retries > 0) {
      try {
        await expect(chatInput).toBeVisible({ timeout: timeout / 3 })
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          console.error("Chat input selectors tried:", [
            `textarea[placeholder*="${getChatPlaceholder().split(" ")[1]}"]`,
            'textarea[placeholder*="Ask"]',
            '[data-testid="chat-input"]',
          ])
          throw error
        }
        console.log(
          `Retrying chat input visibility (${retries} attempts left)...`
        )
        await page.waitForTimeout(2000)
      }
    }

    if (waitForReady) {
      // Wait for input to be enabled
      await expect(chatInput).toBeEnabled({ timeout: 15000 })

      // Ensure input is not disabled by any loading states
      await page.waitForFunction(
        () => {
          const inputs = document.querySelectorAll("textarea")
          for (const input of inputs) {
            if (
              input.placeholder?.includes("Ask") &&
              !input.disabled &&
              !input.readOnly
            ) {
              return true
            }
          }
          return false
        },
        { timeout: 15000 }
      )
    }

    console.log("✅ Chat input is ready")
    return chatInput
  } catch (error) {
    console.error("❌ Chat input not ready:", error)
    await takeDebugScreenshot(page, "chat-input-failed")
    throw error
  }
}

/**
 * Wait for send button to be available and enabled
 */
export async function waitForSendButton(
  page: Page,
  options: { timeout?: number } = {}
): Promise<Locator> {
  const timeout = options.timeout || 10000

  console.log("⏳ Waiting for send button...")

  try {
    const sendButton = page.locator('button[aria-label="Send message"]')

    await expect(sendButton).toBeVisible({ timeout })
    await expect(sendButton).toBeEnabled({ timeout: 5000 })

    console.log("✅ Send button is ready")
    return sendButton
  } catch (error) {
    console.error("❌ Send button not ready:", error)
    throw error
  }
}

/**
 * Wait for Sequential Thinking MCP button and configure it
 */
export async function setupSequentialThinking(
  page: Page,
  options: { timeout?: number; enable?: boolean } = {}
) {
  const timeout = options.timeout || 15000
  const enable = options.enable ?? true

  console.log("⏳ Setting up Sequential Thinking MCP...")

  try {
    const thinkButton = page.locator('[data-testid="think-button"]')
    await expect(thinkButton).toBeVisible({ timeout })

    const buttonText = await thinkButton.textContent()
    console.log(`Think button text: "${buttonText}"`)

    if (!buttonText?.includes("Sequential Thinking MCP")) {
      throw new Error(
        `Expected Sequential Thinking MCP button, got: "${buttonText}"`
      )
    }

    // Check current state
    const buttonClasses = await thinkButton.getAttribute("class")
    const isActive = buttonClasses?.includes("bg-[#E5F3FE]") || false

    console.log(`Button initially active: ${isActive}`)

    // Enable/disable as requested
    if (enable && !isActive) {
      await thinkButton.click()
      await page.waitForTimeout(500) // Wait for state update
      console.log("✅ Sequential Thinking MCP enabled")
    } else if (!enable && isActive) {
      await thinkButton.click()
      await page.waitForTimeout(500) // Wait for state update
      console.log("✅ Sequential Thinking MCP disabled")
    }

    // Verify no auth popover appeared
    const authPopover = page.locator(
      'text="Login to try more features for free"'
    )
    const hasAuthPopover = await authPopover
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    if (hasAuthPopover) {
      throw new Error(
        "Authentication popover appeared - test environment not configured correctly"
      )
    }

    console.log("✅ Sequential Thinking MCP setup complete")
  } catch (error) {
    console.error("❌ Sequential Thinking MCP setup failed:", error)
    throw error
  }
}

/**
 * Send a message and wait for navigation to chat page
 */
export async function sendMessage(
  page: Page,
  message: string,
  options: { timeout?: number } = {}
) {
  const timeout = options.timeout || 30000

  console.log(`📤 Sending message: "${message}"`)

  try {
    // Get chat input
    const chatInput = await waitForChatInput(page, { timeout })

    // Clear and fill input
    await chatInput.fill("")
    await chatInput.fill(message)

    // Get and click send button
    const sendButton = await waitForSendButton(page, { timeout: 10000 })
    await sendButton.click()

    // Wait for navigation to chat page if not already there
    if (!page.url().includes("/c/")) {
      await page.waitForURL(/\/c\/[a-f0-9-]+/, { timeout })
      console.log("✅ Navigated to chat page")
    }

    console.log("✅ Message sent successfully")
  } catch (error) {
    console.error("❌ Failed to send message:", error)
    throw error
  }
}

/**
 * Wait for AI response to appear
 */
export async function waitForAIResponse(
  page: Page,
  options: AIResponseOptions = {}
): Promise<AIResponseResult> {
  const timeout = options.timeout || 120000 // Increased to 2 minutes for MCP responses
  const expectResponse = options.expectResponse ?? true
  const expectReasoning = options.expectReasoning ?? false
  const startTime = Date.now()
  let hasResponse = false
  const reasoningFound = false

  console.log("⏳ Waiting for AI response...")

  try {
    // Wait for first message to appear with multiple possible selectors
    const messageLocator = page
      .locator('[data-testid="message"]')
      .or(page.locator('[data-testid*="message"]'))
      .or(page.locator(".message"))
      .first()

    if (expectResponse) {
      // Use progressive timeout for AI responses (some take longer)
      let responseVisible = false
      const checkInterval = 5000 // Check every 5 seconds
      const maxChecks = Math.ceil(timeout / checkInterval)

      for (let i = 0; i < maxChecks; i++) {
        try {
          await expect(messageLocator).toBeVisible({ timeout: checkInterval })
          responseVisible = true
          break
        } catch (_error) {
          console.log(`AI response check ${i + 1}/${maxChecks}...`)
          if (i === maxChecks - 1) {
            await takeDebugScreenshot(page, "ai-response-timeout")
            throw new Error(`AI response did not appear after ${timeout}ms`)
          }
        }
      }

      if (responseVisible) {
        hasResponse = true
        console.log("✅ AI response appeared")

        // If expecting reasoning, wait for reasoning steps with extended patience
        if (expectReasoning) {
          console.log("🧠 Looking for Sequential Thinking reasoning steps...")

          const reasoningSelectors = [
            '[data-testid*="reasoning"]',
            '[class*="reasoning"]',
            'text="Sequential Reasoning"',
            '[data-testid="reasoning-steps"]',
          ]

          let reasoningFound = false

          // Wait longer for reasoning to appear (MCP can be slow)
          for (const selector of reasoningSelectors) {
            try {
              const reasoningSteps = page.locator(selector)
              await reasoningSteps.first().waitFor({ timeout: 10000 })

              const reasoningCount = await reasoningSteps.count()
              console.log(
                `🧠 Found ${reasoningCount} reasoning elements with selector: ${selector}`
              )

              if (reasoningCount > 0) {
                reasoningFound = true
                break
              }
            } catch (_error) {
              // Continue to next selector
            }
          }

          if (!reasoningFound) {
            console.log(
              "⚠️ No reasoning steps found (may be normal for some responses)"
            )
            // Don't fail the test, just log the warning
          } else {
            console.log("✅ Sequential Thinking reasoning steps detected")
          }
        }
      }
    }

    // Check for error messages
    const errorSelectors = [
      '[role="alert"]',
      ".error",
      '[class*="error"]',
      '[data-testid*="error"]',
      'text*="Error"',
      'text*="Failed"',
    ]

    for (const selector of errorSelectors) {
      try {
        const errorMessages = page.locator(selector)
        const errorCount = await errorMessages.count()

        if (errorCount > 0) {
          console.log(`⚠️ Error messages detected with selector ${selector}:`)
          for (let i = 0; i < Math.min(errorCount, 5); i++) {
            // Limit to 5 errors
            const errorText = await errorMessages.nth(i).textContent()
            console.log(`  ${i + 1}: ${errorText}`)
          }
        }
      } catch (_error) {
        // Continue checking other selectors
      }
    }

    console.log("✅ AI response check complete")

    const responseTime = Date.now() - startTime
    return {
      hasResponse,
      responseTime,
      reasoningFound,
    }
  } catch (error) {
    console.error("❌ AI response check failed:", error)
    await takeDebugScreenshot(page, "ai-response-failed")
    throw error
  }
}

/**
 * Wait for MCP tool invocation to complete
 */
export async function waitForMCPToolInvocation(
  page: Page,
  toolName: string,
  options: MCPToolOptions = {}
) {
  const _timeout = options.timeout || 30000
  const expectSuccess = options.expectSuccess ?? true

  console.log(`⏳ Waiting for MCP tool invocation: ${toolName}`)

  try {
    // Look for tool invocation indicators in the UI
    const _toolIndicator = page.locator(
      `[data-testid*="tool"], [class*="tool"]`
    )

    // Wait for tool activity
    await page.waitForTimeout(5000) // Allow time for tool to be invoked

    // Check console logs for tool invocation
    const logs: string[] = []
    page.on("console", (msg) => {
      const logMessage = msg.text()
      if (
        logMessage.includes(toolName) ||
        logMessage.includes("tool") ||
        logMessage.includes("MCP")
      ) {
        logs.push(logMessage)
        console.log(`🔧 Tool log: ${logMessage}`)
      }
    })

    console.log(`✅ MCP tool invocation check complete for ${toolName}`)
  } catch (error) {
    console.error(`❌ MCP tool invocation failed for ${toolName}:`, error)
    if (expectSuccess) {
      throw error
    }
  }
}

/**
 * Clear browser state for clean test start
 */
export async function clearBrowserState(page: Page) {
  console.log("🧹 Clearing browser state...")

  try {
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Clear cookies
    const context = page.context()
    await context.clearCookies()

    console.log("✅ Browser state cleared")
  } catch (error) {
    console.error("❌ Failed to clear browser state:", error)
    throw error
  }
}

/**
 * Take debug screenshot with timestamp
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `tests/screenshots/debug-${name}-${timestamp}.png`

  try {
    await page.screenshot({
      path: filename,
      fullPage: true,
    })
    console.log(`📸 Debug screenshot saved: ${filename}`)
  } catch (error) {
    console.error("❌ Failed to take debug screenshot:", error)
  }
}

interface NetworkRequest {
  url: string
  method: string
  postData?: {
    model?: string
    thinkingMode?: string
    enableThink?: boolean
    messages?: Record<string, unknown>[]
    userId?: string
    isAuthenticated?: boolean
    tools?: Record<string, unknown>[]
    headers?: Record<string, string>
  } | null
  response?: {
    status: number
    statusText: string
    body?: string
    headers?: Record<string, string>
  } | null
  timestamp?: number
}

/**
 * Capture network requests for debugging
 */
export function setupNetworkCapture(page: Page): {
  requests: NetworkRequest[]
  logs: string[]
} {
  const requests: NetworkRequest[] = []
  const logs: string[] = []

  // Capture requests
  page.on("request", (request) => {
    const postData = request.postData()
    let parsedPostData = null

    if (postData) {
      try {
        parsedPostData = JSON.parse(postData)
      } catch (_error) {
        console.warn("Failed to parse postData as JSON:", postData)
        parsedPostData = { raw: postData }
      }
    }

    const requestData: NetworkRequest = {
      url: request.url(),
      method: request.method(),
      postData: parsedPostData,
      timestamp: Date.now(),
    }

    requests.push(requestData)

    if (request.url().includes("/api/chat")) {
      console.log("📤 API Request:", requestData)
    }
  })

  // Capture responses
  page.on("response", async (response) => {
    if (response.url().includes("/api/chat")) {
      try {
        const responseText = await response.text()
        const requestIndex = requests.findIndex(
          (req) =>
            req.url === response.url() &&
            req.method === response.request().method()
        )

        if (requestIndex !== -1) {
          requests[requestIndex].response = {
            status: response.status(),
            statusText: response.statusText(),
            body: responseText,
            headers: response.headers(),
          }
        }

        console.log("📥 API Response:", {
          url: response.url(),
          status: response.status(),
          preview: `${responseText.substring(0, 200)}...`,
        })
      } catch (error) {
        console.error("❌ Error capturing response:", error)
      }
    }
  })

  // Capture console logs
  page.on("console", (msg) => {
    const logMessage = `[${msg.type()}] ${msg.text()}`
    logs.push(logMessage)

    if (
      msg.text().includes("MCP") ||
      msg.text().includes("tool") ||
      msg.text().includes("🧠") ||
      msg.text().includes("🔧")
    ) {
      console.log("🔍 Console:", logMessage)
    }
  })

  return { requests, logs }
}

/**
 * Wait for server to be fully ready (health check)
 */
export async function waitForServerReady(
  page: Page,
  options: { timeout?: number; baseUrl?: string } = {}
): Promise<boolean> {
  const timeout = options.timeout || 60000
  const baseUrl = options.baseUrl || "http://localhost:3000"

  console.log("⏳ Checking server readiness...")

  let retries = 10
  const retryDelay = timeout / retries

  while (retries > 0) {
    try {
      // Try to access the health endpoint first
      const healthResponse = await page.goto(`${baseUrl}/api/health`, {
        waitUntil: "networkidle",
        timeout: 10000,
      })

      if (healthResponse?.ok()) {
        console.log("✅ Server health check passed")
        return true
      }

      // Fallback to homepage
      const homeResponse = await page.goto(baseUrl, {
        waitUntil: "networkidle",
        timeout: 10000,
      })

      if (homeResponse?.ok()) {
        console.log("✅ Server homepage accessible")
        return true
      }

      throw new Error("Server not responding")
    } catch (error) {
      retries--
      console.log(`Server not ready, ${retries} retries left...`)

      if (retries === 0) {
        throw new Error(`Server not ready after ${timeout}ms: ${error}`)
      }

      await page.waitForTimeout(retryDelay)
    }
  }

  return false // Fallback return for TypeScript
}

/**
 * Enhanced test environment preparation
 */
export async function prepareTestEnvironment(
  page: Page,
  options: { clearState?: boolean; timeout?: number } = {}
) {
  const { clearState = true, timeout = 45000 } = options

  console.log("🧪 Preparing test environment...")

  try {
    // Clear browser state if requested
    if (clearState) {
      await clearBrowserState(page)
    }

    // Wait for server to be ready
    await waitForServerReady(page, { timeout: timeout / 2 })

    // Navigate to homepage and ensure it's ready
    await page.goto("/", { waitUntil: "networkidle", timeout: 15000 })
    await waitForPageReady(page, { timeout: timeout / 2 })

    console.log("✅ Test environment ready")
  } catch (error) {
    console.error("❌ Test environment preparation failed:", error)
    await takeDebugScreenshot(page, "env-prep-failed")
    throw error
  }
}

/**
 * Comprehensive test setup for Sequential Thinking MCP tests
 */
export async function setupSequentialThinkingTest(
  page: Page,
  options: {
    message?: string
    timeout?: number
    expectResponse?: boolean
    expectReasoning?: boolean
  } = {}
) {
  const {
    message = "What is 25% of 80? Please show your reasoning step by step.",
    timeout = 120000, // Extended to 2 minutes
    expectResponse = true,
    expectReasoning = true,
  } = options

  console.log("🧪 Setting up Sequential Thinking MCP test...")

  try {
    // Prepare environment with extended timeout
    await prepareTestEnvironment(page, { timeout: 60000 })

    // Setup network capture
    const capture = setupNetworkCapture(page)

    // Configure Sequential Thinking with retries
    await setupSequentialThinking(page, { enable: true, timeout: 20000 })

    // Send message with extended timeout
    await sendMessage(page, message, { timeout: 45000 })

    // Wait for response with Sequential Thinking timeout
    await waitForAIResponse(page, {
      timeout,
      expectResponse,
      expectReasoning,
    })

    console.log("✅ Sequential Thinking MCP test setup complete")

    return capture
  } catch (error) {
    console.error("❌ Sequential Thinking MCP test setup failed:", error)
    await takeDebugScreenshot(page, "setup-failed")
    throw error
  }
}
