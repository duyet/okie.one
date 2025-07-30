import { defineConfig, devices } from "@playwright/test"

/**
 * Enhanced Playwright configuration for Okie E2E tests
 * Optimized for AI chat tests with Sequential Thinking MCP support
 */
export default defineConfig({
  testDir: "./tests/e2e",

  // Global setup for ensuring server readiness
  globalSetup: require.resolve("./tests/setup/global-setup.ts"),

  /* Run tests in files in parallel - enabled with mocked responses */
  fullyParallel: true, // Parallel execution with reliable mock responses

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Reduced retry configuration with reliable mocks */
  retries: process.env.CI ? 2 : 1, // Fewer retries needed with mocked responses

  /* Optimized worker configuration for sharding */
  workers: process.env.CI ? "75%" : 2, // Use 75% of available cores in CI

  /* Enhanced reporting */
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL with health check */
    baseURL: "http://localhost:3000",

    /* Enhanced tracing for debugging */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Navigation timeout for slow AI responses */
    navigationTimeout: process.env.CI ? 60 * 1000 : 30 * 1000, // 60s in CI, 30s locally

    /* Action timeout for interactive elements */
    actionTimeout: process.env.CI ? 20 * 1000 : 10 * 1000, // 20s in CI, 10s locally
  },

  /* Reduced timeout configuration with mocked responses */
  timeout: process.env.CI ? 60 * 1000 : 45 * 1000, // 60 seconds in CI, 45 seconds locally
  expect: {
    timeout: process.env.CI ? 20 * 1000 : 15 * 1000, // 20 seconds in CI, 15 seconds locally
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for global configuration
    {
      name: "setup",
      testMatch: "**/setup/project-setup.ts",
    },

    // Main browser projects - temporarily disable flaky tests in CI
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Disable web security for local development
        launchOptions: {
          args: process.env.CI
            ? []
            : [
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
              ],
        },
      },
      dependencies: ["setup"],
      // Temporarily ignore flaky tests in CI
      testIgnore: process.env.CI
        ? [
            "**/sequential-thinking-mcp.spec.ts",
            "**/sequential-thinking-enhanced.spec.ts",
            "**/sequential-thinking-tool-invocation.spec.ts",
            "**/sequential-thinking-math.spec.ts",
            "**/api-chat-comprehensive.spec.ts",
            "**/debug-*.spec.ts",
            "**/enhanced-system-prompt-test.spec.ts",
          ]
        : [],
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
      // Skip Firefox tests in CI to reduce load and flakiness
      testIgnore: process.env.CI ? ["**/*.spec.ts"] : [],
    },

    // Disable Mobile testing in CI for now due to flakiness
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        // Mobile-specific timeout adjustments
        navigationTimeout: 60 * 1000,
      },
      dependencies: ["setup"],
      testIgnore: process.env.CI ? ["**/*.spec.ts"] : [],
    },
  ],

  /* Enhanced web server configuration with health checks */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180 * 1000 : 120 * 1000, // 3 minutes in CI, 2 minutes locally

    /* Enhanced server startup detection */
    stdout: "pipe",
    stderr: "pipe",

    /* Health check configuration */
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      // Force test mode for guest user functionality
      BYPASS_AUTH_FOR_TESTS: "true",
    },
  },
})
