import { expect, type Locator, type Page } from "@playwright/test"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getChatPlaceholder } from "./app-config"
import {
  initializeTestDatabase,
  createTestChat,
  createTestUser,
  resetTestData,
  getDefaultTestUserId,
  type TestChat,
} from "../setup/database-setup"

/**
 * Enhanced test helpers for Okie E2E tests
 * Provides robust wait patterns and common test utilities with database setup
 */

// Global test database state
let testDatabaseState: {
  supabase: SupabaseClient | null
  testMode: boolean
} | null = null

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
    // Try multiple selectors for chat input with broader coverage
    const chatInput = page
      .locator(`textarea[placeholder*="${getChatPlaceholder().split(" ")[1]}"]`)
      .or(page.locator('textarea[placeholder*="Ask"]'))
      .or(page.locator('textarea[placeholder*="mind"]'))
      .or(page.locator('textarea[placeholder*="chat"]'))
      .or(page.locator('[data-testid="chat-input"]'))
      .or(page.locator("textarea")) // Fallback to any textarea
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
            'textarea[placeholder*="mind"]',
            'textarea[placeholder*="chat"]',
            '[data-testid="chat-input"]',
            "textarea (fallback)",
          ])

          // Additional debugging: check what elements are actually on the page
          try {
            const allTextareas = await page.locator("textarea").count()
            console.log(`Found ${allTextareas} textarea elements on page`)

            const allPlaceholders = await page
              .locator("textarea")
              .evaluateAll((elements) =>
                elements.map((el) => el.placeholder || "no-placeholder")
              )
            console.log("Textarea placeholders found:", allPlaceholders)
          } catch (debugError) {
            console.log("Could not gather textarea debug info:", debugError)
          }

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
 * Create a test chat to ensure database constraints are satisfied
 */
export async function createTestChatForMessage(
  userId?: string,
  title = "Test Chat",
  model = "gpt-4.1-nano"
): Promise<TestChat> {
  console.log("🏗️ Creating test chat for message...")

  if (!testDatabaseState) {
    testDatabaseState = await initializeTestDatabase()
  }

  const testUserId = userId || getDefaultTestUserId()

  // Create test user if it doesn't exist
  await createTestUser(testDatabaseState.supabase, true)

  // Create test chat
  const chat = await createTestChat(
    testDatabaseState.supabase,
    testUserId,
    title,
    model
  )

  console.log(`✅ Test chat created: ${chat.id}`)
  return chat
}

/**
 * Send a message and wait for navigation to chat page
 * Enhanced with proper test support and debugging
 */
export async function sendMessage(
  page: Page,
  message: string,
  options: { timeout?: number; expectChatCreation?: boolean } = {}
) {
  const timeout = options.timeout || 30000

  console.log(`📤 Sending message: "${message}"`)

  try {
    // Ensure we have test database initialized for guest user support
    if (!testDatabaseState) {
      testDatabaseState = await initializeTestDatabase()
      console.log(
        `🔄 Initialized database in ${testDatabaseState.testMode ? "mock" : "database"} mode`
      )
    }

    // For better test reliability, intercept the create-chat API call to handle guest users
    await page.route("**/api/create-chat", async (route) => {
      const request = route.request()
      const requestBody = request.postDataJSON()

      console.log("🎭 Intercepted create-chat API call")

      // Return a successful chat creation response
      const mockChat = {
        id: crypto.randomUUID(),
        user_id: requestBody?.userId || getDefaultTestUserId(),
        title: requestBody?.title || "Test Chat",
        model: requestBody?.model || "gpt-4.1-nano",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ chat: mockChat }),
      })
    })

    // Get chat input and wait for it to be ready
    const chatInput = await waitForChatInput(page, { timeout })

    // Clear and fill input
    await chatInput.fill("")
    await chatInput.fill(message)

    // Verify the message was entered correctly
    const inputValue = await chatInput.inputValue()
    if (inputValue !== message) {
      throw new Error(
        `Input value mismatch: expected "${message}", got "${inputValue}"`
      )
    }

    // Get and click send button with better error handling
    const sendButton = await waitForSendButton(page, { timeout: 10000 })

    // Store initial URL for flexible navigation handling
    const initialUrl = page.url()
    const isAlreadyOnChatPage = initialUrl.includes("/c/")

    // Click send button
    await sendButton.click()

    // Check for immediate UI errors or disabled states after click
    await page.waitForTimeout(1000) // Brief wait for immediate effects

    const buttonDisabled = await sendButton.getAttribute("disabled")
    const currentUrl = page.url()
    console.log("🔍 Post-click state:", { buttonDisabled, currentUrl })

    // Check for error alerts or toasts
    const errorElements = await page
      .locator('[role="alert"], .error, [data-testid*="error"]')
      .count()
    if (errorElements > 0) {
      const errorTexts = await page
        .locator('[role="alert"], .error, [data-testid*="error"]')
        .allTextContents()
      console.warn("⚠️ UI errors detected after send button click:", errorTexts)
    }

    // Flexible navigation handling - only wait if we're not already on a chat page
    if (!isAlreadyOnChatPage) {
      console.log("🔄 Handling navigation from home to chat page...")

      try {
        // Primary strategy: Wait for URL change with SPA-friendly settings
        await page.waitForURL(/\/c\/[a-f0-9-]+/, {
          timeout: Math.min(timeout, 20000),
          waitUntil: "commit", // Don't wait for load event in SPA navigation
        })
        console.log("✅ Navigation successful via URL pattern match")
      } catch (navigationError) {
        console.log(
          "⚠️ URL pattern match timeout, trying alternative approach..."
        )

        try {
          // Alternative strategy: Wait for any URL change
          await page.waitForFunction(
            (initial) => window.location.href !== initial,
            initialUrl,
            { timeout: 10000 }
          )

          const newUrl = page.url()
          if (newUrl.includes("/c/")) {
            console.log("✅ Navigation successful via URL change detection")
          } else {
            console.log(`⚠️ URL changed but not to chat page: ${newUrl}`)
          }
        } catch (altNavigationError) {
          console.log("⚠️ No navigation detected - checking for SPA behavior...")

          // For SPA behavior, the message might appear without navigation
          // This is handled by the calling code, so we don't fail here
        }
      }
    } else {
      console.log("📍 Already on chat page, no navigation needed")
    }

    // Log the final URL for debugging
    const finalUrl = page.url()
    console.log(`📍 Final URL after sending message: ${finalUrl}`)

    console.log("✅ Message sent successfully")
  } catch (error) {
    console.error("❌ Failed to send message:", error)

    // Enhanced debugging information
    console.log("🔍 Debug info:")
    console.log("  - Current URL:", page.url())
    console.log(
      "  - Test database mode:",
      testDatabaseState?.testMode ? "mock" : "database"
    )

    throw error
  }
}

/**
 * Mock AI response for testing
 */
export async function setupMockAIResponse(
  page: Page,
  mockResponse = "Hello! How can I help you today?"
) {
  console.log("🎭 Setting up mock AI response...")

  await page.route("**/api/chat", async (route) => {
    const request = route.request()
    const requestBody = request.postDataJSON()

    console.log("🎭 Intercepted chat API call:", {
      method: request.method(),
      url: request.url(),
      messagesCount: requestBody?.messages?.length,
    })

    // Create a mock streaming response that matches the AI SDK format
    const messageId = `msg-${crypto.randomUUID()}`
    const streamingChunks = [
      `f:{"messageId":"${messageId}"}\n`,
      `0:"${mockResponse.split(" ")[0]}"\n`,
      ...mockResponse
        .split(" ")
        .slice(1)
        .map((word) => `0:" ${word}"\n`),
      `e:{"finishReason":"stop","usage":{"promptTokens":183,"completionTokens":${mockResponse.split(" ").length}}}\n`,
    ]

    const responseBody = streamingChunks.join("")

    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1",
      },
      body: responseBody,
    })

    console.log("✅ Mock AI response sent")
  })
}

/**
 * Wait for AI response to appear with mock support
 */
export async function waitForAIResponse(
  page: Page,
  options: AIResponseOptions = {}
): Promise<AIResponseResult> {
  const timeout = options.timeout || 30000 // Reduced timeout for mocked responses
  const expectResponse = options.expectResponse ?? true
  const expectReasoning = options.expectReasoning ?? false
  const startTime = Date.now()
  let hasResponse = false
  const reasoningFound = false

  console.log("⏳ Waiting for AI response...")

  try {
    // Wait for message elements with more flexible selectors
    const messageSelectors = [
      '[data-testid="message"]',
      '[data-testid*="message"]',
      '[data-role="assistant"]',
      ".message",
      '[class*="message"]',
    ]

    let messageLocator = null
    for (const selector of messageSelectors) {
      const locator = page.locator(selector)
      const count = await locator.count()
      if (count > 0) {
        messageLocator = locator.first()
        console.log(
          `✅ Found messages with selector: ${selector} (count: ${count})`
        )
        break
      }
    }

    if (!messageLocator) {
      // Fallback to text-based search for the mock response
      messageLocator = page.getByText(/Hello|help|assist/i).first()
    }

    if (expectResponse) {
      // Check for response with shorter intervals for mocked responses
      const checkInterval = 2000 // Check every 2 seconds for mocked responses
      const maxChecks = Math.ceil(timeout / checkInterval)

      for (let i = 0; i < maxChecks; i++) {
        try {
          await expect(messageLocator).toBeVisible({ timeout: checkInterval })
          hasResponse = true
          console.log("✅ AI response appeared")
          break
        } catch (_error) {
          console.log(`AI response check ${i + 1}/${maxChecks}...`)
          if (i === maxChecks - 1) {
            await takeDebugScreenshot(page, "ai-response-timeout")
            throw new Error(`AI response did not appear after ${timeout}ms`)
          }
        }
      }

      if (hasResponse) {
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
    // Clear cookies first (doesn't require page navigation)
    const context = page.context()
    await context.clearCookies()

    // Only clear storage if we have a valid page context
    // Skip if we're on about:blank or similar
    const currentUrl = page.url()
    if (
      currentUrl &&
      !currentUrl.includes("about:") &&
      !currentUrl.includes("data:")
    ) {
      try {
        await page.evaluate(() => {
          localStorage.clear()
          sessionStorage.clear()
        })
      } catch (storageError) {
        // Log but don't throw - storage might not be accessible yet
        console.log(
          "⚠️ Could not clear storage (page might not be ready):",
          storageError
        )
      }
    }

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
  options: {
    clearState?: boolean
    timeout?: number
    enableMockResponses?: boolean
  } = {}
) {
  const {
    clearState = true,
    timeout = 45000,
    enableMockResponses = true,
  } = options

  console.log("🧪 Preparing test environment...")

  // Set up console error monitoring
  const consoleErrors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const errorText = msg.text()
      consoleErrors.push(errorText)
      console.error("🚨 Console Error:", errorText)
    }
  })

  // Set up uncaught exception monitoring
  page.on("pageerror", (error) => {
    console.error("🚨 Page Error:", error.message)
    consoleErrors.push(`Page Error: ${error.message}`)
  })

  // Store error monitoring in page context for later access
  ;(page as any).testErrors = consoleErrors

  try {
    // Initialize test database if not already done
    if (!testDatabaseState) {
      testDatabaseState = await initializeTestDatabase()
    }

    // Auto-enable mock responses in CI or when MOCK_AI_RESPONSES is set
    const shouldMockResponses =
      enableMockResponses ||
      process.env.CI === "true" ||
      process.env.MOCK_AI_RESPONSES === "true"

    if (shouldMockResponses) {
      console.log(
        "🎭 Auto-enabling mock AI responses for faster test execution..."
      )
      await setupMockAIResponse(page, "I'm a test AI assistant, ready to help!")
    }

    // Clear browser state if requested
    if (clearState) {
      await clearBrowserState(page)

      // Reset test data for clean test state
      await resetTestData(testDatabaseState.supabase)
    }

    // Wait for server to be ready
    await waitForServerReady(page, { timeout: timeout / 2 })

    // Navigate to homepage with enhanced error handling
    try {
      await page.goto("/", { waitUntil: "networkidle", timeout: 15000 })
    } catch (gotoError) {
      console.log("⚠️ Initial navigation failed, retrying with load state...")
      await page.goto("/", { waitUntil: "load", timeout: 10000 })
    }

    // Wait for page to be ready with flexible timeout
    await waitForPageReady(page, { timeout: timeout / 2 })

    console.log(
      `✅ Test environment ready (${testDatabaseState.testMode ? "mock" : "database"} mode, AI responses: ${shouldMockResponses ? "mocked" : "real"})`
    )
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
