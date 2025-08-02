import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import {
  ButtonThink,
  type ThinkingMode,
} from "@/app/components/chat-input/button-think"

// Mock the user preferences provider
const mockIsMcpServerEnabled = vi.fn()

vi.mock("@/lib/user-preference-store/provider", () => ({
  useUserPreferences: () => ({
    isMcpServerEnabled: mockIsMcpServerEnabled,
  }),
}))

// Mock Phosphor icons
vi.mock("@phosphor-icons/react", () => ({
  BrainIcon: ({ className }: { className?: string }) => (
    <div data-testid="brain-icon" className={className} />
  ),
  CaretDownIcon: ({ className }: { className?: string }) => (
    <div data-testid="caret-down-icon" className={className} />
  ),
  CheckIcon: ({ className }: { className?: string }) => (
    <div data-testid="check-icon" className={className} />
  ),
}))

// Mock PopoverContentAuth
vi.mock("@/app/components/chat-input/popover-content-auth", () => ({
  PopoverContentAuth: () => <div data-testid="auth-popover">Auth Required</div>,
}))

describe("ButtonThink MCP Integration", () => {
  const defaultProps = {
    thinkingMode: "none" as ThinkingMode,
    onModeChange: vi.fn(),
    isAuthenticated: true,
    hasNativeReasoning: false,
  }

  // Store original values for restoration
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    // Environment is already 'test' in test environment
    // Reset window location to localhost (test environment)
    Object.defineProperty(window, "location", {
      value: { hostname: "localhost" },
      writable: true,
      configurable: true,
    })
    // Default: Sequential Thinking enabled
    mockIsMcpServerEnabled.mockReturnValue(true)
  })

  afterEach(() => {
    // Restore original values
    vi.unstubAllEnvs()
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  describe("Non-reasoning models", () => {
    test("shows button when Sequential Thinking MCP is enabled", () => {
      mockIsMcpServerEnabled.mockReturnValue(true)

      render(<ButtonThink {...defaultProps} />)

      expect(screen.getByTestId("think-button")).toBeInTheDocument()
      expect(screen.getByText("Sequential Thinking MCP")).toBeInTheDocument()
    })

    test("hides button when Sequential Thinking MCP is disabled", () => {
      mockIsMcpServerEnabled.mockReturnValue(false)

      render(<ButtonThink {...defaultProps} />)

      expect(screen.queryByTestId("think-button")).not.toBeInTheDocument()
    })

    test("toggles Sequential Thinking mode when clicked", async () => {
      const mockOnModeChange = vi.fn()
      const user = userEvent.setup()

      render(
        <ButtonThink
          {...defaultProps}
          onModeChange={mockOnModeChange}
          thinkingMode="none"
        />
      )

      const button = screen.getByTestId("think-button")
      await user.click(button)

      expect(mockOnModeChange).toHaveBeenCalledWith("sequential")
    })

    test("toggles from sequential to none when clicked", async () => {
      const mockOnModeChange = vi.fn()
      const user = userEvent.setup()

      render(
        <ButtonThink
          {...defaultProps}
          onModeChange={mockOnModeChange}
          thinkingMode="sequential"
        />
      )

      const button = screen.getByTestId("think-button")
      await user.click(button)

      expect(mockOnModeChange).toHaveBeenCalledWith("none")
    })

    test("applies selected styling when thinking mode is active", () => {
      render(<ButtonThink {...defaultProps} thinkingMode="sequential" />)

      const button = screen.getByTestId("think-button")
      expect(button).toHaveClass("border-[#0091FF]/20", "bg-[#E5F3FE]")
    })
  })

  describe("Reasoning models", () => {
    const reasoningProps = {
      ...defaultProps,
      hasNativeReasoning: true,
    }

    test("shows dropdown when Sequential Thinking MCP is enabled", () => {
      mockIsMcpServerEnabled.mockReturnValue(true)

      render(<ButtonThink {...reasoningProps} />)

      expect(screen.getByTestId("think-button")).toBeInTheDocument()
      expect(screen.getByTestId("caret-down-icon")).toBeInTheDocument()
    })

    test("still shows dropdown when Sequential Thinking MCP is disabled", () => {
      mockIsMcpServerEnabled.mockReturnValue(false)

      render(<ButtonThink {...reasoningProps} />)

      expect(screen.getByTestId("think-button")).toBeInTheDocument()
      expect(screen.getByTestId("caret-down-icon")).toBeInTheDocument()
    })

    test("includes Sequential Thinking option when MCP is enabled", async () => {
      mockIsMcpServerEnabled.mockReturnValue(true)
      const user = userEvent.setup()

      render(<ButtonThink {...reasoningProps} />)

      const button = screen.getByTestId("think-button")
      await user.click(button)

      expect(screen.getByText("Disable Thinking")).toBeInTheDocument()
      expect(screen.getByText("Thinking (Native)")).toBeInTheDocument()
      expect(screen.getByText("Sequential Thinking MCP")).toBeInTheDocument()
    })

    test("excludes Sequential Thinking option when MCP is disabled", async () => {
      mockIsMcpServerEnabled.mockReturnValue(false)
      const user = userEvent.setup()

      render(<ButtonThink {...reasoningProps} />)

      const button = screen.getByTestId("think-button")
      await user.click(button)

      expect(screen.getByText("Disable Thinking")).toBeInTheDocument()
      expect(screen.getByText("Thinking (Native)")).toBeInTheDocument()
      expect(
        screen.queryByText("Sequential Thinking MCP")
      ).not.toBeInTheDocument()
    })

    test("resets thinking mode when Sequential Thinking is disabled and currently selected", () => {
      const mockOnModeChange = vi.fn()
      mockIsMcpServerEnabled.mockReturnValue(false)

      render(
        <ButtonThink
          {...reasoningProps}
          thinkingMode="sequential"
          onModeChange={mockOnModeChange}
        />
      )

      expect(mockOnModeChange).toHaveBeenCalledWith("none")
    })

    test("shows correct label for different thinking modes", () => {
      // Test sequential mode
      render(<ButtonThink {...reasoningProps} thinkingMode="sequential" />)
      expect(screen.getByText("Sequential Thinking MCP")).toBeInTheDocument()

      // Test regular mode
      render(<ButtonThink {...reasoningProps} thinkingMode="regular" />)
      expect(screen.getByText("Thinking (Native)")).toBeInTheDocument()

      // Test none mode
      render(<ButtonThink {...reasoningProps} thinkingMode="none" />)
      expect(screen.getByText("Thinking")).toBeInTheDocument()
    })
  })

  describe("Authentication handling", () => {
    test("shows auth popover for unauthenticated users (non-test environment)", () => {
      // Mock non-test environment
      vi.stubEnv("NODE_ENV", "production")

      // Mock window.location to not be localhost
      Object.defineProperty(window, "location", {
        value: { hostname: "example.com" },
        writable: true,
        configurable: true,
      })

      render(<ButtonThink {...defaultProps} isAuthenticated={false} />)

      expect(screen.getByTestId("auth-popover")).toBeInTheDocument()

      // Restore original environment
      vi.unstubAllEnvs()
    })

    test("allows Sequential Thinking for unauthenticated users in test environment", () => {
      // Ensure we're in test environment (already set in beforeEach)
      render(<ButtonThink {...defaultProps} isAuthenticated={false} />)

      expect(screen.getByTestId("think-button")).toBeInTheDocument()
      expect(screen.queryByTestId("auth-popover")).not.toBeInTheDocument()
    })
  })

  describe("MCP server integration", () => {
    test("calls isMcpServerEnabled with correct server ID", () => {
      render(<ButtonThink {...defaultProps} />)

      expect(mockIsMcpServerEnabled).toHaveBeenCalledWith("sequential-thinking")
    })

    test("responds to MCP settings changes", () => {
      // Start with MCP enabled
      mockIsMcpServerEnabled.mockReturnValue(true)
      const { rerender } = render(<ButtonThink {...defaultProps} />)

      expect(screen.getByTestId("think-button")).toBeInTheDocument()

      // Simulate MCP being disabled
      mockIsMcpServerEnabled.mockReturnValue(false)

      // Force a re-render by changing props to trigger useEffect/useMemo updates
      rerender(<ButtonThink {...defaultProps} key={Math.random()} />)

      // For non-reasoning models, when MCP is disabled, button should not appear
      expect(screen.queryByTestId("think-button")).not.toBeInTheDocument()
    })

    test("handles undefined MCP server state gracefully", () => {
      // Mock console.warn to silence expected error logs
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      mockIsMcpServerEnabled.mockImplementation(() => {
        throw new Error("MCP server error")
      })

      // Should not crash the component and should default to disabled state
      expect(() => render(<ButtonThink {...defaultProps} />)).not.toThrow()

      // Should show nothing for non-reasoning models when MCP fails
      expect(screen.queryByTestId("think-button")).not.toBeInTheDocument()

      // Should log the warning
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to check MCP server state:",
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe("Edge cases", () => {
    test("handles rapid MCP setting changes", async () => {
      // Start with MCP enabled
      mockIsMcpServerEnabled.mockReturnValue(true)
      const { rerender } = render(<ButtonThink {...defaultProps} />)

      // Rapidly toggle MCP setting
      mockIsMcpServerEnabled.mockReturnValue(false)
      rerender(<ButtonThink {...defaultProps} key="disabled" />)

      mockIsMcpServerEnabled.mockReturnValue(true)
      rerender(<ButtonThink {...defaultProps} key="enabled" />)

      expect(screen.getByTestId("think-button")).toBeInTheDocument()
    })

    test("preserves component state during MCP changes", () => {
      const mockOnModeChange = vi.fn()

      // Start with MCP enabled and sequential mode
      mockIsMcpServerEnabled.mockReturnValue(true)
      const { rerender } = render(
        <ButtonThink
          {...defaultProps}
          onModeChange={mockOnModeChange}
          thinkingMode="sequential"
        />
      )

      // MCP is disabled, should reset mode (this happens in the component's useEffect)
      mockIsMcpServerEnabled.mockReturnValue(false)

      // Force a re-render to trigger the reset logic
      rerender(
        <ButtonThink
          {...defaultProps}
          onModeChange={mockOnModeChange}
          thinkingMode="sequential"
          key="mcp-disabled"
        />
      )

      // The component should call onModeChange to reset to "none"
      expect(mockOnModeChange).toHaveBeenCalledWith("none")
    })
  })
})
