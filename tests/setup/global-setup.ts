import { chromium, type FullConfig } from "@playwright/test"
import { initializeTestDatabase } from "./database-setup"

/**
 * Global setup for Playwright tests
 * Ensures server is fully ready before running tests
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000"
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log("🚀 Starting global setup...")

  // Enhanced health check function with progressive retry logic
  const healthCheck = async (
    retries = 15,
    initialDelay = 1000
  ): Promise<boolean> => {
    console.log(`🔍 Starting health check with ${retries} max attempts...`)

    for (let i = 0; i < retries; i++) {
      // Progressive delay - start small, increase gradually
      const delay = Math.min(initialDelay * 1.2 ** i, 5000)

      try {
        console.log(
          `Health check attempt ${i + 1}/${retries} (delay: ${delay}ms)...`
        )

        // First: Try the health endpoint
        try {
          const healthResponse = await page.goto(`${baseURL}/api/health`, {
            waitUntil: "domcontentloaded", // Less strict than networkidle
            timeout: 8000,
          })

          if (healthResponse?.ok()) {
            console.log("✅ Health endpoint responded successfully")
            return true
          }
        } catch (healthError) {
          console.log(`Health endpoint failed: ${healthError}`)
        }

        // Second: Try the homepage with basic checks
        try {
          const homeResponse = await page.goto(baseURL, {
            waitUntil: "domcontentloaded",
            timeout: 8000,
          })

          if (homeResponse?.ok()) {
            // Wait for page to be somewhat ready
            await page.waitForLoadState("domcontentloaded", { timeout: 5000 })

            // Check for critical elements with multiple selectors
            const headingSelectors = ["h1", '[role="heading"]', ".heading"]
            let headingFound = false

            for (const selector of headingSelectors) {
              try {
                const heading = page.locator(selector).first()
                const title = await heading.textContent({ timeout: 3000 })

                if (
                  title &&
                  (title.includes("What's on your mind?") ||
                    title.includes("Ask") ||
                    title.includes("Okie"))
                ) {
                  console.log(
                    `✅ Homepage loaded with expected content: "${title}"`
                  )
                  headingFound = true
                  break
                }
              } catch (_error) {
                // Continue to next selector
              }
            }

            if (headingFound) {
              return true
            } else {
              console.log("⚠️ Homepage loaded but expected content not found")
            }
          }
        } catch (homeError) {
          console.log(`Homepage check failed: ${homeError}`)
        }

        // If this is the last attempt, throw error
        if (i === retries - 1) {
          throw new Error(
            `Server health check failed after ${retries} attempts. Server may be starting up.`
          )
        }

        console.log(`Waiting ${delay}ms before next attempt...`)
        await page.waitForTimeout(delay)
      } catch (error) {
        console.log(`Health check attempt ${i + 1} failed: ${error}`)

        if (i === retries - 1) {
          throw new Error(
            `Server not ready after ${retries} attempts: ${error}`
          )
        }

        console.log(`Retrying in ${delay}ms...`)
        await page.waitForTimeout(delay)
      }
    }

    return false
  }

  // Enhanced MCP server readiness check
  const mcpReadinessCheck = async (): Promise<void> => {
    try {
      console.log("🧠 Checking MCP server readiness...")

      // Navigate to homepage and wait for basic loading
      await page.goto(baseURL, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      })

      // Wait for basic page structure
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 })

      // Look for the think button with multiple attempts and selectors
      const thinkButtonSelectors = [
        '[data-testid="think-button"]',
        '[aria-label*="think"]',
        'button:has-text("Sequential Thinking")',
        'button:has-text("MCP")',
      ]

      let thinkButton = null
      let buttonFound = false

      for (const selector of thinkButtonSelectors) {
        try {
          thinkButton = page.locator(selector).first()
          await thinkButton.waitFor({ timeout: 8000 })
          buttonFound = true
          console.log(`Think button found with selector: ${selector}`)
          break
        } catch (error) {
          console.log(`Think button not found with selector: ${selector}`)
          console.error(error)
        }
      }

      if (buttonFound && thinkButton) {
        try {
          const buttonText = await thinkButton.textContent({ timeout: 5000 })
          console.log(`Think button text: "${buttonText}"`)

          if (
            buttonText?.includes("Sequential Thinking MCP") ||
            buttonText?.includes("MCP")
          ) {
            console.log("✅ Sequential Thinking MCP system is ready")
          } else {
            console.log(
              `⚠️ Think button found but text unexpected: "${buttonText}"`
            )
          }
        } catch (textError) {
          console.log("⚠️ Could not read think button text:", textError)
        }
      } else {
        console.log(
          "⚠️ Sequential Thinking MCP button not found (may initialize later)"
        )
      }

      // Additional check: look for any MCP-related console messages
      const mcpLogs: string[] = []
      page.on("console", (msg) => {
        const text = msg.text()
        if (
          text.includes("MCP") ||
          text.includes("Sequential") ||
          text.includes("thinking")
        ) {
          mcpLogs.push(text)
        }
      })

      // Wait a bit for any console logs
      await page.waitForTimeout(2000)

      if (mcpLogs.length > 0) {
        console.log(`📋 MCP-related logs found: ${mcpLogs.length} messages`)
      }
    } catch (error) {
      console.log("⚠️ MCP readiness check failed (non-critical):", error)
      // Don't fail the setup for MCP issues, just log them
    }
  }

  try {
    // Initialize test database before other checks
    console.log("🗄️ Initializing test database...")
    const databaseState = await initializeTestDatabase()
    console.log(
      `✅ Database initialized (${databaseState.testMode ? "mock" : "database"} mode)`
    )

    // Perform health checks
    await healthCheck()
    await mcpReadinessCheck()

    console.log("✅ Global setup completed successfully")
  } catch (error) {
    console.error("❌ Global setup failed:", error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup
