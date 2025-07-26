import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TokenAnalytics } from "@/app/analytics/token-usage"

// Mock the fetch function for API calls
global.fetch = vi.fn()

// Mock the recharts components
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}))

const mockFetch = fetch as any

describe("TokenAnalytics", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
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

  const mockUserAnalytics = [
    {
      usage_date: "2023-01-01",
      total_tokens: 1000,
      total_messages: 10,
      total_cost_usd: 0.05,
      providers: [{ provider: "openai", tokens: 1000 }],
      models: [{ model: "gpt-4", tokens: 1000 }],
    },
    {
      usage_date: "2023-01-02",
      total_tokens: 1500,
      total_messages: 15,
      total_cost_usd: 0.075,
      providers: [{ provider: "openai", tokens: 1500 }],
      models: [{ model: "gpt-4", tokens: 1500 }],
    },
  ]

  const mockLeaderboard = [
    {
      user_id: "user-1",
      total_tokens: 5000,
      total_input_tokens: 3000,
      total_output_tokens: 2000,
      total_cached_tokens: 100,
      total_messages: 50,
      total_cost_usd: 0.25,
      avg_duration_ms: 2000,
      top_provider: "openai",
      top_model: "gpt-4",
    },
    {
      user_id: "user-2",
      total_tokens: 3000,
      total_input_tokens: 1800,
      total_output_tokens: 1200,
      total_cached_tokens: 50,
      total_messages: 30,
      total_cost_usd: 0.15,
      avg_duration_ms: 1800,
      top_provider: "anthropic",
      top_model: "claude-3",
    },
  ]

  it("should render loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    expect(screen.getByText("Loading analytics...")).toBeInTheDocument()
  })

  it("should render user analytics data successfully", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserAnalytics),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLeaderboard),
      })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(screen.getByText("Token Usage Analytics")).toBeInTheDocument()
    })

    // Check if analytics data is displayed
    expect(screen.getByText("Total Tokens")).toBeInTheDocument()
    expect(screen.getByText("2,500")).toBeInTheDocument() // Sum of tokens
    expect(screen.getByText("Total Messages")).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument() // Sum of messages
    expect(screen.getByText("Total Cost")).toBeInTheDocument()
    expect(screen.getByText("$0.13")).toBeInTheDocument() // Sum of costs
  })

  it("should render charts when data is available", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserAnalytics),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLeaderboard),
      })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(screen.getByTestId("line-chart")).toBeInTheDocument()
    })

    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument()
  })

  it("should render leaderboard when showLeaderboard is true", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserAnalytics),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLeaderboard),
      })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(screen.getByText("Daily Leaderboard")).toBeInTheDocument()
    })

    expect(screen.getByText("5,000")).toBeInTheDocument() // Top user tokens
    expect(screen.getByText("3,000")).toBeInTheDocument() // Second user tokens
  })

  it("should not render leaderboard when showLeaderboard is false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUserAnalytics),
    })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={false} />)

    await waitFor(() => {
      expect(screen.getByText("Token Usage Analytics")).toBeInTheDocument()
    })

    expect(screen.queryByText("Daily Leaderboard")).not.toBeInTheDocument()
  })

  it("should handle empty analytics data", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(screen.getByText("No usage data available")).toBeInTheDocument()
    })
  })

  it("should handle API errors gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(screen.getByText("Error loading analytics data")).toBeInTheDocument()
    })
  })

  it("should handle HTTP error responses", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(screen.getByText("Error loading analytics data")).toBeInTheDocument()
    })
  })

  it("should make correct API calls", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserAnalytics),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLeaderboard),
      })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={true} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/analytics/token-usage?userId=user-123")
    })

    expect(mockFetch).toHaveBeenCalledWith("/api/analytics/token-usage?leaderboard=true")
  })

  it("should calculate totals correctly", async () => {
    const customAnalytics = [
      {
        usage_date: "2023-01-01",
        total_tokens: 1234,
        total_messages: 12,
        total_cost_usd: 0.0567,
        providers: [],
        models: [],
      },
      {
        usage_date: "2023-01-02",
        total_tokens: 5678,
        total_messages: 34,
        total_cost_usd: 0.1234,
        providers: [],
        models: [],
      },
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(customAnalytics),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

    renderWithQueryClient(<TokenAnalytics userId="user-123" showLeaderboard={false} />)

    await waitFor(() => {
      expect(screen.getByText("6,912")).toBeInTheDocument() // 1234 + 5678
    })

    expect(screen.getByText("46")).toBeInTheDocument() // 12 + 34
    expect(screen.getByText("$0.18")).toBeInTheDocument() // 0.0567 + 0.1234 rounded
  })

  it("should handle different user IDs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    renderWithQueryClient(<TokenAnalytics userId="different-user-456" showLeaderboard={false} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/analytics/token-usage?userId=different-user-456")
    })
  })

  it("should re-fetch data when userId changes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    const { rerender } = renderWithQueryClient(
      <TokenAnalytics userId="user-1" showLeaderboard={false} />
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/analytics/token-usage?userId=user-1")
    })

    rerender(
      <QueryClientProvider client={queryClient}>
        <TokenAnalytics userId="user-2" showLeaderboard={false} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/analytics/token-usage?userId=user-2")
    })
  })
})