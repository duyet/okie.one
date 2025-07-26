import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AnalyticsPage from "@/app/analytics/page"

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

// Mock the TokenAnalytics component
vi.mock("@/app/analytics/token-usage", () => ({
  default: vi.fn(({ userId, showLeaderboard }) => (
    <div data-testid="token-analytics">
      <div data-testid="user-id">{userId}</div>
      <div data-testid="show-leaderboard">
        {showLeaderboard ? "true" : "false"}
      </div>
    </div>
  )),
}))

const mockCreateClient = createClient as any
const mockRedirect = redirect as any

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

    render(AnalyticsPageComponent)

    expect(screen.getByTestId("token-analytics")).toBeInTheDocument()
    expect(screen.getByTestId("user-id")).toHaveTextContent("user-123")
    expect(screen.getByTestId("show-leaderboard")).toHaveTextContent("true")
  })

  it("should redirect to auth when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await AnalyticsPage()

    expect(mockRedirect).toHaveBeenCalledWith("/auth")
  })

  it("should redirect to auth when auth check fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth failed" },
    })

    await AnalyticsPage()

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

    render(AnalyticsPageComponent)

    expect(screen.getByTestId("user-id")).toHaveTextContent("test-user-789")
    expect(screen.getByTestId("show-leaderboard")).toHaveTextContent("true")
  })

  it("should handle supabase client creation failure", async () => {
    mockCreateClient.mockResolvedValue(null)

    // This should still attempt to get user, but we'll simulate auth failure
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Client creation failed" },
    })

    await AnalyticsPage()

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

    render(AnalyticsPageComponent)

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

    render(AnalyticsPageComponent)

    expect(screen.getByTestId("user-id")).toHaveTextContent("async-user-123")
  })
})
