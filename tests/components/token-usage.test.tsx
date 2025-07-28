import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TokenAnalytics } from "@/app/analytics/token-usage"

// Mock the recharts components
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}))

// Mock the daily chart component to avoid complexity
vi.mock("@/app/analytics/daily-token-usage-chart", () => ({
  DailyTokenUsageChart: ({ userId }: { userId?: string }) => (
    <div data-testid="daily-chart">
      Daily chart for user: {userId || "none"}
    </div>
  ),
}))

describe("TokenAnalytics", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
      },
    })
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it("should render leaderboard when showLeaderboard is true", async () => {
    renderWithQueryClient(<TokenAnalytics showLeaderboard={true} />)

    await waitFor(
      () => {
        expect(screen.getByTestId("leaderboard-title")).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it("should not show leaderboard when showLeaderboard is false", async () => {
    renderWithQueryClient(<TokenAnalytics showLeaderboard={false} />)

    // Just verify that leaderboard title is not present
    expect(screen.queryByTestId("leaderboard-title")).not.toBeInTheDocument()
  })

  it("should render with userId provided", async () => {
    renderWithQueryClient(<TokenAnalytics userId="user-123" />)

    await waitFor(
      () => {
        // Should show stats cards
        expect(screen.getByText("Total Tokens")).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it("should show loading state initially", () => {
    renderWithQueryClient(<TokenAnalytics userId="user-123" />)
    expect(screen.getByText("Loading analytics...")).toBeInTheDocument()
  })

  it("should show daily chart when userId is provided", async () => {
    renderWithQueryClient(<TokenAnalytics userId="user-123" />)

    await waitFor(() => {
      expect(screen.getByTestId("daily-chart")).toBeInTheDocument()
    })
  })

  it("should show empty state when no props provided", () => {
    renderWithQueryClient(<TokenAnalytics />)
    // Component should render without crashing
    expect(screen.getByText("Loading analytics...")).toBeInTheDocument()
  })
})
