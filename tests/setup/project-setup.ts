import { test as setup } from "@playwright/test"

/**
 * Project setup file for individual test projects
 * Runs before each project's tests to ensure environment is ready
 */
setup("ensure test environment is ready", async ({ page }) => {
  console.log("🧪 Running project setup...")

  try {
    // Navigate to homepage to ensure server is responsive
    await page.goto("/", { waitUntil: "networkidle", timeout: 30000 })

    // Verify basic page elements are present
    const heading = page.locator("h1").first()
    await heading.waitFor({ timeout: 10000 })

    const headingText = await heading.textContent()
    if (!headingText?.includes("What's on your mind?")) {
      throw new Error(`Unexpected heading text: "${headingText}"`)
    }

    console.log("✅ Project setup completed successfully")
  } catch (error) {
    console.error("❌ Project setup failed:", error)
    throw error
  }
})
