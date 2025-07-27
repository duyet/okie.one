import { render, screen, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ButtonThink } from "@/app/components/chat-input/button-think"
import { TooltipProvider } from "@/components/ui/tooltip"

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

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>{children}</TooltipProvider>
  )
}

describe("ButtonThink", () => {
  const mockOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render the think button", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={true} />, {
      wrapper: createWrapper(),
    })

    const button = screen.getByRole("button")
    expect(button).toBeDefined()
    expect(screen.getByText("Think")).toBeDefined()
  })

  it("should show brain icon", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={true} />, {
      wrapper: createWrapper(),
    })

    // Check if the brain icon is present (it should be in the DOM)
    const button = screen.getByRole("button")
    expect(button.querySelector("svg")).toBeDefined()
  })

  it("should call onToggle when clicked (authenticated user)", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={true} />, {
      wrapper: createWrapper(),
    })

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(mockOnToggle).toHaveBeenCalledTimes(1)
    expect(mockOnToggle).toHaveBeenCalledWith(true)
  })

  it("should toggle state correctly", () => {
    const { rerender } = render(
      <ButtonThink
        isSelected={false}
        onToggle={mockOnToggle}
        isAuthenticated={true}
      />,
      { wrapper: createWrapper() }
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(mockOnToggle).toHaveBeenCalledWith(true)

    // Rerender with selected state
    rerender(
      <ButtonThink
        isSelected={true}
        onToggle={mockOnToggle}
        isAuthenticated={true}
      />
    )

    fireEvent.click(button)
    expect(mockOnToggle).toHaveBeenCalledWith(false)
  })

  it("should apply selected styles when isSelected is true", () => {
    render(
      <ButtonThink
        isSelected={true}
        onToggle={mockOnToggle}
        isAuthenticated={true}
      />,
      { wrapper: createWrapper() }
    )

    const button = screen.getByRole("button")
    expect(button.className).toContain("border-[#0091FF]/20")
    expect(button.className).toContain("bg-[#E5F3FE]")
    expect(button.className).toContain("text-[#0091FF]")
  })

  it("should not apply selected styles when isSelected is false", () => {
    render(
      <ButtonThink
        isSelected={false}
        onToggle={mockOnToggle}
        isAuthenticated={true}
      />,
      { wrapper: createWrapper() }
    )

    const button = screen.getByRole("button")
    expect(button.className).not.toContain("border-[#0091FF]/20")
    expect(button.className).not.toContain("bg-[#E5F3FE]")
    expect(button.className).not.toContain("text-[#0091FF]")
  })

  it("should show authentication required for unauthenticated users", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={false} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText("Think")).toBeDefined()
    expect(screen.getByText("Sign in required")).toBeDefined()
  })

  it("should not call onToggle for unauthenticated users", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={false} />, {
      wrapper: createWrapper(),
    })

    const button = screen.getByRole("button")
    fireEvent.click(button)

    // Should not call onToggle for unauthenticated users
    expect(mockOnToggle).not.toHaveBeenCalled()
  })

  it("should have responsive text visibility", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={true} />, {
      wrapper: createWrapper(),
    })

    const text = screen.getByText("Think")
    expect(text.className).toContain("hidden")
    expect(text.className).toContain("md:block")
  })

  it("should handle undefined onToggle gracefully", () => {
    render(<ButtonThink isAuthenticated={true} />, { wrapper: createWrapper() })

    const button = screen.getByRole("button")

    // Should not throw an error when onToggle is undefined
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it("should default isSelected to false when not provided", () => {
    render(<ButtonThink onToggle={mockOnToggle} isAuthenticated={true} />, {
      wrapper: createWrapper(),
    })

    const button = screen.getByRole("button")
    fireEvent.click(button)

    // Should call onToggle with true (toggling from default false)
    expect(mockOnToggle).toHaveBeenCalledWith(true)
  })
})
