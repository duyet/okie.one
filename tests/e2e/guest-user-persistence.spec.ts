import { test, expect, type Page } from "@playwright/test"

test.describe("Guest User Persistence", () => {
  const getGuestUserId = async (page: Page): Promise<string | null> => {
    return await page.evaluate(() => {
      return (
        localStorage.getItem("guest-user-id") ||
        localStorage.getItem("fallback-guest-id")
      )
    })
  }

  const clearAllStorage = async (page: Page) => {
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("should generate a UUID-format guest ID on first visit", async ({
    page,
  }) => {
    // Clear storage after page load
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization by waiting for the guest ID to be set
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const guestId = await getGuestUserId(page)

    // Verify UUID format
    expect(guestId).toBeTruthy()
    expect(guestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  test("should persist guest ID across page refreshes", async ({ page }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const initialGuestId = await getGuestUserId(page)
    expect(initialGuestId).toBeTruthy()

    // Refresh the page
    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    const refreshedGuestId = await getGuestUserId(page)
    expect(refreshedGuestId).toBe(initialGuestId)
  })

  test("should persist guest ID in multiple storage locations", async ({
    page,
  }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const storageData = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem("guest-user-id"),
        fallbackLocalStorage: localStorage.getItem("fallback-guest-id"),
        sessionStorage: sessionStorage.getItem("guest-user-id"),
      }
    })

    // All storage locations should have the same ID
    expect(storageData.localStorage).toBeTruthy()
    expect(storageData.localStorage).toBe(storageData.fallbackLocalStorage)
    expect(storageData.localStorage).toBe(storageData.sessionStorage)
  })

  test("should recover guest ID from sessionStorage when localStorage is cleared", async ({
    page,
  }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const initialGuestId = await getGuestUserId(page)
    expect(initialGuestId).toBeTruthy()

    // Clear only localStorage
    await page.evaluate(() => {
      localStorage.clear()
    })

    // Refresh the page
    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    const recoveredGuestId = await getGuestUserId(page)
    expect(recoveredGuestId).toBe(initialGuestId)
  })

  test("should maintain guest ID using device fingerprint when all storage is cleared", async ({
    page,
  }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const initialGuestId = await getGuestUserId(page)
    expect(initialGuestId).toBeTruthy()

    // Get fingerprint mapping
    const fingerprintMapping = await page.evaluate(() => {
      return localStorage.getItem("guest-fingerprints")
    })
    expect(fingerprintMapping).toBeTruthy()

    // Clear all storage except fingerprints
    await page.evaluate(() => {
      const fingerprints = localStorage.getItem("guest-fingerprints")
      localStorage.clear()
      sessionStorage.clear()
      if (fingerprints) {
        localStorage.setItem("guest-fingerprints", fingerprints)
      }
    })

    // Refresh the page
    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    const recoveredGuestId = await getGuestUserId(page)
    expect(recoveredGuestId).toBe(initialGuestId)
  })

  test("should allow guest users to send messages", async ({ page }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const guestId = await getGuestUserId(page)
    expect(guestId).toBeTruthy()

    // Wait for the chat interface to load
    const messageInput = page.locator("textarea").first()
    await expect(messageInput).toBeVisible({ timeout: 10000 })

    // Type a message
    await messageInput.fill("Hello, I am a guest user!")

    // Find and click the send button
    const sendButton = page
      .locator('button[aria-label*="Send"]')
      .or(
        page.locator("button").filter({
          hasText: /send/i,
        })
      )
      .or(
        page
          .locator('button[type="button"]')
          .filter({
            has: page.locator("svg"),
          })
          .last()
      )

    await expect(sendButton).toBeVisible({ timeout: 5000 })
    await sendButton.click()

    // Wait for the message to appear in the chat
    await expect(
      page.locator('text="Hello, I am a guest user!"').first()
    ).toBeVisible({
      timeout: 15000,
    })

    // Verify the guest ID is still the same
    const postMessageGuestId = await getGuestUserId(page)
    expect(postMessageGuestId).toBe(guestId)
  })

  test("should show login options when clicking guest avatar", async ({
    page,
  }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    // Wait for header to be visible
    await expect(page.locator("header").first()).toBeVisible({ timeout: 10000 })

    // Find the user avatar/menu button - it should be in the header
    const userAvatar = page
      .locator("header button")
      .filter({
        has: page
          .locator("span")
          .or(page.locator("img"))
          .or(page.locator("svg")),
      })
      .last()

    await expect(userAvatar).toBeVisible({ timeout: 5000 })
    await userAvatar.click()

    // Check for login/signup options in the dropdown
    await expect(page.locator('text="Sign In"')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('text="Create Account"')).toBeVisible({
      timeout: 5000,
    })
  })

  test("should maintain chat history for guest users across refreshes", async ({
    page,
  }) => {
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await page.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const guestId = await getGuestUserId(page)
    expect(guestId).toBeTruthy()

    // Send a message
    const messageInput = page.locator("textarea").first()
    await expect(messageInput).toBeVisible({ timeout: 10000 })
    await messageInput.fill("Test message for persistence")

    const sendButton = page.locator('button[aria-label*="Send"]').or(
      page
        .locator('button[type="button"]')
        .filter({
          has: page.locator("svg"),
        })
        .last()
    )

    await expect(sendButton).toBeVisible({ timeout: 5000 })
    await sendButton.click()

    // Wait for the message to appear
    await expect(
      page.locator('text="Test message for persistence"').first()
    ).toBeVisible({
      timeout: 15000,
    })

    // Get the chat URL
    await page.waitForTimeout(2000)
    const chatUrl = page.url()
    expect(chatUrl).toContain("/c/")

    // Refresh the page
    await page.reload()
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // Verify the message is still visible
    await expect(
      page.locator('text="Test message for persistence"').first()
    ).toBeVisible({
      timeout: 10000,
    })

    // Verify the guest ID is maintained
    const refreshedGuestId = await getGuestUserId(page)
    expect(refreshedGuestId).toBe(guestId)
  })

  test("should generate new guest ID in incognito mode", async ({
    browser,
  }) => {
    // Create regular context
    const regularContext = await browser.newContext()
    const regularPage = await regularContext.newPage()

    await regularPage.goto("/")
    await regularPage.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await regularPage.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const regularGuestId = await getGuestUserId(regularPage)
    expect(regularGuestId).toBeTruthy()

    // Create incognito context
    const incognitoContext = await browser.newContext()
    const incognitoPage = await incognitoContext.newPage()

    await incognitoPage.goto("/")
    await incognitoPage.waitForLoadState("networkidle")

    // Wait for guest user initialization
    await incognitoPage.waitForFunction(
      () => {
        const id =
          localStorage.getItem("guest-user-id") ||
          localStorage.getItem("fallback-guest-id")
        return (
          id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        )
      },
      { timeout: 10000 }
    )

    const incognitoGuestId = await getGuestUserId(incognitoPage)
    expect(incognitoGuestId).toBeTruthy()

    // Guest IDs should be different
    expect(incognitoGuestId).not.toBe(regularGuestId)

    await regularContext.close()
    await incognitoContext.close()
  })
})
