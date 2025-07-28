import { expect, test } from "@playwright/test"
import { getAppName } from "../helpers/app-config"

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/")

    // Check that the page loads
    await expect(page).toHaveTitle(new RegExp(getAppName(), "i"))

    // Check for key elements
    await expect(page.locator("body")).toBeVisible()
  })

  test("should have proper meta tags", async ({ page }) => {
    await page.goto("/")

    // Check meta viewport
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute(
      "content",
      "width=device-width, initial-scale=1"
    )
  })

  test("should be responsive", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/")

    await expect(page.locator("body")).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto("/")

    await expect(page.locator("body")).toBeVisible()
  })
})
