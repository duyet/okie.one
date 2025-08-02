import { render, screen } from "@testing-library/react"
import { redirect } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AnalyticsPage from "@/app/analytics/page"
import { createClient } from "@/lib/supabase/server"
import { TestWrapper } from "@/tests/utils/test-wrappers"

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

// Mock the user preferences hook
vi.mock("@/lib/user-preference-store/provider", () => ({
  useUserPreferences: () => ({
    preferences: {
      layout: "sidebar",
      theme: "light",
      model: "gpt-4",
    },
    updatePreferences: vi.fn(),
    isLoading: false,
  }),
}))

// Mock the LayoutApp component to avoid complex provider setup
vi.mock("@/app/components/layout/layout-app", () => ({
  LayoutApp: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout-app">{children}</div>
  ),
}))

// Mock the MessagesProvider
vi.mock("@/lib/chat-store/messages/provider", () => ({
  MessagesProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="messages-provider">{children}</div>
  ),
}))

// Mock the TokenAnalytics component
vi.mock("@/app/analytics/token-usage", () => ({
  TokenAnalytics: vi.fn(({ userId, showLeaderboard }) => (
    <div data-testid="token-analytics">
      <div data-testid="user-id">{userId}</div>
      <div data-testid="show-leaderboard">
        {showLeaderboard ? "true" : "false"}
      </div>
    </div>
  )),
}))

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>

describe("AnalyticsPage", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  it("should render analytics page for authenticated user", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const AnalyticsPageComponent = await AnalyticsPage()

    render(<TestWrapper>{AnalyticsPageComponent}</TestWrapper>)

    expect(screen.getByTestId("token-analytics")).toBeInTheDocument()
    expect(screen.getByTestId("user-id")).toHaveTextContent("user-123")
    expect(screen.getByTestId("show-leaderboard")).toHaveTextContent("true")
  })

  it("should redirect to auth when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    // Mock redirect to prevent actual navigation in tests
    mockRedirect.mockImplementation(() => {
      throw new Error("Redirected to /auth")
    })

    await expect(AnalyticsPage()).rejects.toThrow("Redirected to /auth")
    expect(mockRedirect).toHaveBeenCalledWith("/auth")
  })

  it("should redirect to auth when auth check fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth failed" },
    })

    // Mock redirect to prevent actual navigation in tests
    mockRedirect.mockImplementation(() => {
      throw new Error("Redirected to /auth")
    })

    await expect(AnalyticsPage()).rejects.toThrow("Redirected to /auth")
    expect(mockRedirect).toHaveBeenCalledWith("/auth")
  })

  it("should create supabase client", async () => {
    const mockUser = {
      id: "user-456",
      email: "user@example.com",
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    await AnalyticsPage()

    expect(mockCreateClient).toHaveBeenCalled()
    expect(mockSupabase.auth.getUser).toHaveBeenCalled()
  })

  it("should pass correct props to TokenAnalytics component", async () => {
    const mockUser = {
      id: "test-user-789",
      email: "analytics@example.com",
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const AnalyticsPageComponent = await AnalyticsPage()

    render(<TestWrapper>{AnalyticsPageComponent}</TestWrapper>)

    expect(screen.getByTestId("user-id")).toHaveTextContent("test-user-789")
    expect(screen.getByTestId("show-leaderboard")).toHaveTextContent("true")
  })

  it("should handle supabase client creation failure", async () => {
    mockCreateClient.mockResolvedValue(null)

    // Mock redirect to prevent actual navigation in tests
    mockRedirect.mockImplementation(() => {
      throw new Error("Redirected to /auth")
    })

    await expect(AnalyticsPage()).rejects.toThrow("Redirected to /auth")
    expect(mockRedirect).toHaveBeenCalledWith("/auth")
  })

  it("should handle different user data structures", async () => {
    const mockUser = {
      id: "complex-user-id-123",
      email: "complex@example.com",
      user_metadata: {
        name: "Test User",
      },
      app_metadata: {
        provider: "email",
      },
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const AnalyticsPageComponent = await AnalyticsPage()

    render(<TestWrapper>{AnalyticsPageComponent}</TestWrapper>)

    expect(screen.getByTestId("user-id")).toHaveTextContent(
      "complex-user-id-123"
    )
  })

  it("should handle async operations correctly", async () => {
    const mockUser = {
      id: "async-user-123",
      email: "async@example.com",
    }

    // Simulate async delay
    mockSupabase.auth.getUser.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { user: mockUser },
                error: null,
              }),
            10
          )
        )
    )

    const AnalyticsPageComponent = await AnalyticsPage()

    render(<TestWrapper>{AnalyticsPageComponent}</TestWrapper>)

    expect(screen.getByTestId("user-id")).toHaveTextContent("async-user-123")
  })
})
