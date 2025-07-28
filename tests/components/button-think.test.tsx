import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ButtonThink } from "@/app/components/chat-input/button-think"
import { TooltipProvider } from "@/components/ui/tooltip"

// Mock the UserPreferencesProvider hook
vi.mock("@/lib/user-preference-store/provider", () => ({
  useUserPreferences: () => ({
    preferences: {
      mcpSettings: {
        "sequential-thinking": true,
      },
    },
    updatePreferences: vi.fn(),
    isLoading: false,
    isMcpServerEnabled: vi.fn((serverId: string) => {
      return serverId === "sequential-thinking"
    }),
  }),
}))

// Mock the Popover components
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    asChild,
    children,
  }: {
    asChild?: boolean
    children: React.ReactNode
  }) => (asChild ? children : <div>{children}</div>),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

// Mock the PopoverContentAuth component
vi.mock("@/app/components/chat-input/popover-content-auth", () => ({
  PopoverContentAuth: () => <div>Sign in required</div>,
}))

// Mock the dropdown menu components
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick} data-testid="dropdown-item">
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({
    asChild,
    children,
  }: {
    asChild?: boolean
    children: React.ReactNode
  }) => (asChild ? children : <div>{children}</div>),
}))

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>{children}</TooltipProvider>
  )
}

describe("ButtonThink", () => {
  const mockOnModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render the think button for reasoning models", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const button = screen.getByTestId("think-button")
    expect(button).toBeDefined()
    expect(screen.getByText("Thinking")).toBeDefined()
  })

  it("should render the sequential thinking button for non-reasoning models", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={false}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const button = screen.getByTestId("think-button")
    expect(button).toBeDefined()
    expect(screen.getByText("Sequential Thinking MCP")).toBeDefined()
  })

  it("should show brain icon", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    // Check if the brain icon is present (it should be in the DOM)
    const button = screen.getByTestId("think-button")
    expect(button.querySelector("svg")).toBeDefined()
  })

  it("should show dropdown menu items for reasoning models", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.getByText("Disable Thinking")).toBeDefined()
    expect(screen.getByText("Thinking (Native)")).toBeDefined()
    expect(screen.getByText("Sequential Thinking MCP")).toBeDefined()
  })

  it("should not show dropdown for non-reasoning models", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={false}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.queryByTestId("dropdown-menu")).toBeNull()
    expect(screen.getByText("Sequential Thinking MCP")).toBeDefined()
  })

  it("should call onModeChange with 'none' when Disable Thinking is clicked", () => {
    render(
      <ButtonThink
        thinkingMode="regular"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const disableButton = screen.getByText("Disable Thinking")
    fireEvent.click(disableButton)

    expect(mockOnModeChange).toHaveBeenCalledTimes(1)
    expect(mockOnModeChange).toHaveBeenCalledWith("none")
  })

  it("should call onModeChange with 'regular' when Thinking (Native) is clicked", () => {
    render(
      <ButtonThink
        thinkingMode="none"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const thinkButton = screen.getByText("Thinking (Native)")
    fireEvent.click(thinkButton)

    expect(mockOnModeChange).toHaveBeenCalledTimes(1)
    expect(mockOnModeChange).toHaveBeenCalledWith("regular")
  })

  it("should call onModeChange with 'sequential' when Sequential Thinking MCP is clicked", () => {
    render(
      <ButtonThink
        thinkingMode="none"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const sequentialButton = screen.getByText("Sequential Thinking MCP")
    fireEvent.click(sequentialButton)

    expect(mockOnModeChange).toHaveBeenCalledTimes(1)
    expect(mockOnModeChange).toHaveBeenCalledWith("sequential")
  })

  it("should toggle sequential mode for non-reasoning models", () => {
    render(
      <ButtonThink
        thinkingMode="none"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={false}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const button = screen.getByTestId("think-button")
    fireEvent.click(button)

    expect(mockOnModeChange).toHaveBeenCalledTimes(1)
    expect(mockOnModeChange).toHaveBeenCalledWith("sequential")
  })

  it("should apply selected styles when thinkingMode is not 'none'", () => {
    render(
      <ButtonThink
        thinkingMode="regular"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      { wrapper: createWrapper() }
    )

    const button = screen.getByTestId("think-button")
    expect(button.className).toContain("border-[#0091FF]/20")
    expect(button.className).toContain("bg-[#E5F3FE]")
    expect(button.className).toContain("text-[#0091FF]")
  })

  it("should not apply selected styles when thinkingMode is 'none'", () => {
    render(
      <ButtonThink
        thinkingMode="none"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      { wrapper: createWrapper() }
    )

    const button = screen.getByTestId("think-button")
    expect(button.className).not.toContain("border-[#0091FF]/20")
    expect(button.className).not.toContain("bg-[#E5F3FE]")
    expect(button.className).not.toContain("text-[#0091FF]")
  })

  it("should show 'Sequential Thinking MCP' text when thinkingMode is 'sequential'", () => {
    render(
      <ButtonThink
        thinkingMode="sequential"
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      { wrapper: createWrapper() }
    )

    // Check that the button shows the Sequential Thinking MCP text
    const button = screen.getByTestId("think-button")
    // Use more specific check to avoid matching dropdown items
    const buttonText = button.querySelector(".hidden.md\\:block")
    expect(buttonText?.textContent).toBe("Sequential Thinking MCP")
  })

  it("should show authentication required for unauthenticated users (reasoning model)", () => {
    // Mock NODE_ENV via vi.stubEnv to force authentication flow
    vi.stubEnv("NODE_ENV", "production")

    // Mock window location to not be localhost
    Object.defineProperty(window, "location", {
      value: { hostname: "example.com" },
      writable: true,
    })

    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={false}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.getByText("Thinking")).toBeDefined()
    expect(screen.getByText("Sign in required")).toBeDefined()

    // Restore environment
    vi.unstubAllEnvs()
  })

  it("should show authentication required for unauthenticated users (non-reasoning model)", () => {
    // Mock NODE_ENV via vi.stubEnv to force authentication flow
    vi.stubEnv("NODE_ENV", "production")

    // Mock window location to not be localhost
    Object.defineProperty(window, "location", {
      value: { hostname: "example.com" },
      writable: true,
    })

    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={false}
        hasNativeReasoning={false}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.getByText("Sequential Thinking MCP")).toBeDefined()
    expect(screen.getByText("Sign in required")).toBeDefined()

    // Restore environment
    vi.unstubAllEnvs()
  })

  it("should not show dropdown for unauthenticated users", () => {
    render(
      <ButtonThink onModeChange={mockOnModeChange} isAuthenticated={false} />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.queryByTestId("dropdown-menu")).toBeNull()
  })

  it("should have responsive text visibility", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    const text = screen.getByText("Thinking")
    expect(text.className).toContain("hidden")
    expect(text.className).toContain("md:block")
  })

  it("should handle undefined onModeChange gracefully", () => {
    render(<ButtonThink isAuthenticated={true} hasNativeReasoning={true} />, {
      wrapper: createWrapper(),
    })

    const disableButton = screen.getByText("Disable Thinking")

    // Should not throw an error when onModeChange is undefined
    expect(() => fireEvent.click(disableButton)).not.toThrow()
  })

  it("should default thinkingMode to 'none' when not provided", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        isAuthenticated={true}
        hasNativeReasoning={true}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    // The button should not have selected styles
    const button = screen.getByTestId("think-button")
    expect(button.className).not.toContain("border-[#0091FF]/20")
  })
})
