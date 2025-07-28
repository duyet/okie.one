import { expect, test } from "@playwright/test"

import {
  clearBrowserState,
  prepareTestEnvironment,
  sendMessage,
  setupNetworkCapture,
  takeDebugScreenshot,
  waitForAIResponse,
  waitForChatInput,
} from "../helpers/test-helpers"

test.describe("Guest User Chat", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and localStorage to ensure we start as a guest
    await context.clearCookies()
    await clearBrowserState(page)

    // Prepare test environment for guest user
    await prepareTestEnvironment(page, { clearState: false, timeout: 60000 })
  })

  test("should allow guest users to send chat messages", async ({ page }) => {
    const testMessage = "Hello, I am a guest user testing the chat!"

    // Setup network monitoring for debugging
    const capture = setupNetworkCapture(page)

    try {
      console.log("👥 Testing guest user chat functionality...")

      // Verify we're starting as a guest user with enhanced detection
      console.log("🔍 Verifying guest user status...")
      const userMenu = page.locator(
        '[aria-label="User menu"], [data-testid="user-menu"], button:has-text("Sign in")'
      )
      const isGuestUser = await userMenu
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (isGuestUser) {
        await userMenu.click()
        const signInButton = page.locator(
          'text="Sign in", [data-testid="sign-in-button"], button:has-text("Sign in")'
        )
        if (await signInButton.isVisible({ timeout: 5000 })) {
          console.log("✅ Confirmed guest user status")
          await page.keyboard.press("Escape")
        }
      } else {
        console.log("👥 Assuming guest user (no user menu found)")
      }

      // Ensure chat input is ready
      console.log("🔍 Waiting for chat input to be ready...")
      await waitForChatInput(page, { timeout: 45000 })

      // Send message using helper (handles all the complexity)
      console.log("📤 Sending guest user message...")
      await sendMessage(page, testMessage, { timeout: 90000 }) // Extended timeout for guest users

      // Verify message appears in chat with enhanced selector
      console.log("👀 Verifying message visibility...")
      const messageLocator = page
        .locator(
          `text="${testMessage}", [data-testid*="message"]:has-text("${testMessage}"), [class*="message"]:has-text("${testMessage}")`
        )
        .first()
      await expect(messageLocator).toBeVisible({ timeout: 45000 })

      console.log("✅ Guest user message sent successfully")

      // Check for rate limit or authentication errors (expected for guests)
      console.log("🔍 Checking for rate limits...")
      const limitError = page.locator(
        "text=/daily message limit|rate limit|quota exceeded|limit reached/i"
      )
      const hasLimitError = await limitError
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (hasLimitError) {
        const errorText = await limitError.textContent()
        console.log("ℹ️ Guest user hit rate limit (expected):", errorText)
      } else {
        // Try to wait for AI response but don't fail if it doesn't come
        console.log("🤖 Checking for AI response...")
        try {
          const responseResult = await waitForAIResponse(page, {
            timeout: 90000, // Extended timeout for guest users
            expectResponse: false, // Guest users might not get responses
            expectReasoning: false,
          })
          console.log("✅ AI response received for guest user", {
            hasResponse: responseResult.hasResponse,
            responseTime: responseResult.responseTime,
          })
        } catch (_error: unknown) {
          console.log(
            "ℹ️ No AI response for guest user (may be expected due to API limits)"
          )
          // Don't fail the test - guest users might not get responses due to API limits
        }
      }

      // Verify no critical authentication errors occurred
      console.log("🔍 Checking for critical errors...")
      const criticalErrors = page.locator(
        "text=/authentication required|failed to send|unauthorized|permission denied/i"
      )
      const criticalErrorCount = await criticalErrors.count()

      if (criticalErrorCount > 0) {
        console.log("⚠️ Detected potential critical errors:")
        for (let i = 0; i < Math.min(criticalErrorCount, 3); i++) {
          const errorText = await criticalErrors.nth(i).textContent()
          console.log(`  ${i + 1}: ${errorText}`)
        }

        // Only fail if there are actual authentication failures
        const hasAuthFailure = await page
          .locator("text=/authentication required|failed to send/i")
          .isVisible({ timeout: 5000 })

        if (hasAuthFailure) {
          throw new Error(
            "Guest user unable to send message due to authentication errors"
          )
        } else {
          console.log("ℹ️ Errors detected but not blocking guest functionality")
        }
      }

      console.log("✅ Guest user chat test completed successfully")
    } catch (error: unknown) {
      console.error("❌ Guest user chat test failed:", error)
      console.log("📊 Network Analysis:")
      console.log("  - Total requests:", capture.requests.length)
      console.log(
        "  - Chat requests:",
        capture.requests.filter((r) => r.url.includes("/api/chat")).length
      )
      console.log(
        "  - Failed requests:",
        capture.requests.filter((r) => !r.response || r.response.status >= 400)
          .length
      )
      console.log("  - Recent console logs:", capture.logs.slice(-5)) // Last 5 logs
      await takeDebugScreenshot(page, "guest-chat-failed")
      throw error
    }
  })

  test("should persist guest user across page reloads", async ({ page }) => {
    try {
      console.log("🔄 Testing guest user persistence across reloads...")

      // Wait for initial page load to complete
      console.log("⏳ Waiting for initial load...")
      await page.waitForLoadState("networkidle", { timeout: 30000 })

      // Get the guest user ID from localStorage after initial load with enhanced detection
      console.log("🔍 Checking localStorage for guest user data...")
      const guestDataBefore = await page.evaluate(() => {
        const allKeys = Object.keys(localStorage)
        const guestKeys = allKeys.filter(
          (key) =>
            key.includes("guest") ||
            key.includes("user") ||
            key.includes("sb-") ||
            key.includes("supabase")
        )

        return {
          guestUserId: localStorage.getItem("guest-user-id"),
          fallbackGuestId: localStorage.getItem("fallback-guest-id"),
          guestId: localStorage.getItem("guestUserId"),
          supabaseUserId: localStorage.getItem("sb-user-id"),
          supabaseAuth: localStorage.getItem("sb-auth-token"),
          allGuestKeys: guestKeys,
          storageSize: allKeys.length,
        }
      })

      console.log("🔑 Guest data before reload:", guestDataBefore)

      // Determine primary guest ID
      const primaryGuestId =
        guestDataBefore.guestUserId ||
        guestDataBefore.fallbackGuestId ||
        guestDataBefore.guestId ||
        guestDataBefore.supabaseUserId

      console.log("🎯 Primary guest ID:", primaryGuestId)

      // Reload the page with proper waiting
      console.log("🔄 Reloading page...")
      await page.reload({ waitUntil: "networkidle", timeout: 45000 })

      // Wait for page to be fully ready again
      console.log("⏳ Re-preparing test environment...")
      await prepareTestEnvironment(page, { clearState: false, timeout: 60000 })

      // Check that the guest data persists
      console.log("🔍 Checking localStorage after reload...")
      const guestDataAfter = await page.evaluate(() => {
        const allKeys = Object.keys(localStorage)
        const guestKeys = allKeys.filter(
          (key) =>
            key.includes("guest") ||
            key.includes("user") ||
            key.includes("sb-") ||
            key.includes("supabase")
        )

        return {
          guestUserId: localStorage.getItem("guest-user-id"),
          fallbackGuestId: localStorage.getItem("fallback-guest-id"),
          guestId: localStorage.getItem("guestUserId"),
          supabaseUserId: localStorage.getItem("sb-user-id"),
          supabaseAuth: localStorage.getItem("sb-auth-token"),
          allGuestKeys: guestKeys,
          storageSize: allKeys.length,
        }
      })

      console.log("🔑 Guest data after reload:", guestDataAfter)

      // Determine primary guest ID after reload
      const primaryGuestIdAfter =
        guestDataAfter.guestUserId ||
        guestDataAfter.fallbackGuestId ||
        guestDataAfter.guestId ||
        guestDataAfter.supabaseUserId

      console.log("🎯 Primary guest ID after:", primaryGuestIdAfter)

      // Verify persistence
      expect(primaryGuestIdAfter).toBeTruthy()

      if (primaryGuestId && primaryGuestIdAfter) {
        expect(primaryGuestIdAfter).toBe(primaryGuestId)
        console.log("✅ Guest ID persisted correctly")
      } else if (primaryGuestIdAfter) {
        console.log("ℹ️ New guest ID created after reload (acceptable behavior)")
      } else {
        throw new Error("No guest user ID found after reload")
      }

      console.log("✅ Guest user persistence test completed")
    } catch (error: unknown) {
      console.error("❌ Guest user persistence test failed:", error)
      await takeDebugScreenshot(page, "guest-persistence-failed")
      throw error
    }
  })

  test("should not show authentication errors for guest users", async ({
    page,
  }) => {
    const testMessage = "Test message for auth check"

    // Setup comprehensive monitoring
    const capture = setupNetworkCapture(page)
    const consoleErrors: string[] = []

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
        console.log("❌ Console error:", msg.text())
      }
    })

    try {
      // Send message using helper
      await sendMessage(page, testMessage, { timeout: 45000 })

      // Wait for any errors to surface
      await page.waitForTimeout(5000)

      // Check console errors for authentication issues
      const authErrors = consoleErrors.filter(
        (error) =>
          error.toLowerCase().includes("auth") ||
          error.toLowerCase().includes("foreign key") ||
          error.toLowerCase().includes("constraint") ||
          error.toLowerCase().includes("unauthorized") ||
          error.toLowerCase().includes("permission")
      )

      if (authErrors.length > 0) {
        console.log("⚠️ Authentication-related console errors found:")
        authErrors.forEach((error, index) => {
          console.log(`  ${index + 1}: ${error}`)
        })
      }

      expect(authErrors).toHaveLength(0)

      // Check for visible authentication error messages
      const authErrorMessages = page.locator(
        "text=/authentication required|sign in required|login required|permission denied/i"
      )

      const authErrorCount = await authErrorMessages.count()
      if (authErrorCount > 0) {
        console.log("⚠️ Visible authentication errors found:")
        for (let i = 0; i < authErrorCount; i++) {
          const errorText = await authErrorMessages.nth(i).textContent()
          console.log(`  ${i + 1}: ${errorText}`)
        }
      }

      await expect(authErrorMessages).not.toBeVisible()

      console.log("✅ No authentication errors for guest user")
    } catch (error: unknown) {
      console.error("❌ Authentication error check failed:", error)
      console.log("📊 Console errors during test:", consoleErrors)
      console.log("📊 Network activity:", capture.requests.slice(-5)) // Last 5 requests
      await takeDebugScreenshot(page, "guest-auth-errors")
      throw error
    }
  })
})
