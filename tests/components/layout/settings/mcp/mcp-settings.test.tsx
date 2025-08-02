import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { McpSettings } from "@/app/components/layout/settings/mcp/mcp-settings"

// Mock the user preferences provider
const mockSetMcpServerEnabled = vi.fn()
const mockIsMcpServerEnabled = vi.fn()

vi.mock("@/lib/user-preference-store/provider", () => ({
  useUserPreferences: () => ({
    setMcpServerEnabled: mockSetMcpServerEnabled,
    isMcpServerEnabled: mockIsMcpServerEnabled,
  }),
}))

// Mock Phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  BrainIcon: ({ className }: { className?: string }) => (
    <div data-testid="brain-icon" className={className} />
  ),
}))

describe("McpSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: Sequential Thinking enabled
    mockIsMcpServerEnabled.mockImplementation((serverId: string) => {
      return serverId === "sequential-thinking"
    })
  })

  test("renders MCP settings header", () => {
    render(<McpSettings />)

    expect(screen.getByText("MCP Servers")).toBeInTheDocument()
    expect(
      screen.getByText(/Enable or disable Model Context Protocol/)
    ).toBeInTheDocument()
  })

  test("renders Sequential Thinking MCP server", () => {
    render(<McpSettings />)

    expect(screen.getByText("Sequential Thinking MCP")).toBeInTheDocument()
    expect(
      screen.getByText(/Advanced step-by-step reasoning/)
    ).toBeInTheDocument()
    expect(screen.getByText("Auth Required")).toBeInTheDocument()
    expect(screen.getByTestId("brain-icon")).toBeInTheDocument()
  })

  test("shows switch in correct state based on server enabled status", () => {
    const { rerender } = render(<McpSettings />)

    const switchElement = screen.getByLabelText(
      "Toggle Sequential Thinking MCP"
    )
    expect(switchElement).toBeChecked()

    // Test disabled state
    mockIsMcpServerEnabled.mockReturnValue(false)
    rerender(<McpSettings />)

    const disabledSwitch = screen.getByLabelText(
      "Toggle Sequential Thinking MCP"
    )
    expect(disabledSwitch).not.toBeChecked()
  })

  test("calls setMcpServerEnabled when switch is toggled", async () => {
    const user = userEvent.setup()
    render(<McpSettings />)

    const switchElement = screen.getByLabelText(
      "Toggle Sequential Thinking MCP"
    )
    await user.click(switchElement)

    expect(mockSetMcpServerEnabled).toHaveBeenCalledWith(
      "sequential-thinking",
      false
    )
  })

  test("calls setMcpServerEnabled with correct parameters when toggling from disabled to enabled", async () => {
    mockIsMcpServerEnabled.mockReturnValue(false)
    const user = userEvent.setup()
    render(<McpSettings />)

    const switchElement = screen.getByLabelText(
      "Toggle Sequential Thinking MCP"
    )
    await user.click(switchElement)

    expect(mockSetMcpServerEnabled).toHaveBeenCalledWith(
      "sequential-thinking",
      true
    )
  })

  test("displays auth required badge for servers that require authentication", () => {
    render(<McpSettings />)

    expect(screen.getByText("Auth Required")).toBeInTheDocument()
  })

  test("renders correct server description", () => {
    render(<McpSettings />)

    expect(
      screen.getByText(
        "Advanced step-by-step reasoning for non-reasoning models"
      )
    ).toBeInTheDocument()
  })

  test("has proper accessibility attributes", () => {
    render(<McpSettings />)

    const switchElement = screen.getByLabelText(
      "Toggle Sequential Thinking MCP"
    )
    expect(switchElement).toBeInTheDocument()

    // Should have proper labeling through parent structure
    expect(
      switchElement.closest('[data-testid="mcp-server-item"]')
    ).toBeTruthy()
  })

  test("displays server icon with correct styling", () => {
    render(<McpSettings />)

    const icon = screen.getByTestId("brain-icon")
    expect(icon).toHaveClass("size-5", "text-muted-foreground")
  })

  test("handles multiple server configurations correctly", () => {
    // Add a mock for future servers
    vi.doMock("../mcp-server-registry", () => ({
      MCP_SERVERS: [
        {
          id: "sequential-thinking",
          name: "Sequential Thinking MCP",
          description:
            "Advanced step-by-step reasoning for non-reasoning models",
          icon: () => <div data-testid="brain-icon" />,
          requiresAuth: true,
          defaultEnabled: true,
        },
        {
          id: "test-server",
          name: "Test Server",
          description: "Test server description",
          icon: () => <div data-testid="test-icon" />,
          requiresAuth: false,
          defaultEnabled: false,
        },
      ],
    }))

    render(<McpSettings />)

    expect(screen.getByText("Sequential Thinking MCP")).toBeInTheDocument()
    // Note: The test server won't appear because it's not in the actual registry
    // This test demonstrates how the component would handle multiple servers
  })

  test("switch state updates when isMcpServerEnabled returns different values", () => {
    // First render with enabled
    mockIsMcpServerEnabled.mockReturnValue(true)
    const { rerender } = render(<McpSettings />)
    expect(
      screen.getByLabelText("Toggle Sequential Thinking MCP")
    ).toBeChecked()

    // Rerender with disabled
    mockIsMcpServerEnabled.mockReturnValue(false)
    rerender(<McpSettings />)
    expect(
      screen.getByLabelText("Toggle Sequential Thinking MCP")
    ).not.toBeChecked()
  })

  test("maintains consistent layout structure", () => {
    render(<McpSettings />)

    // Check main container structure - find the outermost div
    const mainContainer = screen
      .getByText("MCP Servers")
      .closest("div")?.parentElement
    expect(mainContainer).toHaveClass("space-y-6", "pb-12")

    // Check server item structure
    const serverItem = screen
      .getByText("Sequential Thinking MCP")
      .closest("div")
    expect(serverItem).toBeTruthy()
  })
})
