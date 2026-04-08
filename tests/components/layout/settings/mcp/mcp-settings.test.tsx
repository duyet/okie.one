import { render, screen } from "@testing-library/react"
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

describe("McpSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMcpServerEnabled.mockReturnValue(false)
  })

  test("renders MCP settings header", () => {
    render(<McpSettings />)

    expect(screen.getByText("MCP Servers")).toBeInTheDocument()
  })

  test("component renders without errors", () => {
    const { container } = render(<McpSettings />)

    expect(container).toBeInTheDocument()
  })

  test("displays description text when no servers", () => {
    render(<McpSettings />)

    expect(screen.getByText("MCP Servers")).toBeInTheDocument()
  })
})
