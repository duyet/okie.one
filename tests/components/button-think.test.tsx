import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ButtonThink } from "@/app/components/chat-input/button-think"
import { TooltipProvider } from "@/components/ui/tooltip"

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
      <ButtonThink onModeChange={mockOnModeChange} hasNativeReasoning={true} />,
      {
        wrapper: createWrapper(),
      }
    )

    const button = screen.getByTestId("think-button")
    expect(button).toBeDefined()
    expect(screen.getByText("Thinking")).toBeDefined()
  })

  it("should not render for non-reasoning models", () => {
    render(
      <ButtonThink
        onModeChange={mockOnModeChange}
        hasNativeReasoning={false}
      />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.queryByTestId("think-button")).toBeNull()
  })

  it("should show brain icon", () => {
    render(
      <ButtonThink onModeChange={mockOnModeChange} hasNativeReasoning={true} />,
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
      <ButtonThink onModeChange={mockOnModeChange} hasNativeReasoning={true} />,
      {
        wrapper: createWrapper(),
      }
    )

    expect(screen.getByText("Disable Thinking")).toBeDefined()
    expect(screen.getByText("Thinking (Native)")).toBeDefined()
  })

  it("should call onModeChange with 'none' when Disable Thinking is clicked", () => {
    render(
      <ButtonThink
        thinkingMode="regular"
        onModeChange={mockOnModeChange}
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

  it("should apply selected styles when thinkingMode is not 'none'", () => {
    render(
      <ButtonThink
        thinkingMode="regular"
        onModeChange={mockOnModeChange}
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
        hasNativeReasoning={true}
      />,
      { wrapper: createWrapper() }
    )

    const button = screen.getByTestId("think-button")
    expect(button.className).not.toContain("border-[#0091FF]/20")
    expect(button.className).not.toContain("bg-[#E5F3FE]")
    expect(button.className).not.toContain("text-[#0091FF]")
  })

  it("should show 'Thinking (Native)' text when thinkingMode is 'regular'", () => {
    render(
      <ButtonThink
        thinkingMode="regular"
        onModeChange={mockOnModeChange}
        hasNativeReasoning={true}
      />,
      { wrapper: createWrapper() }
    )

    // Check that the button shows the Thinking (Native) text
    const button = screen.getByTestId("think-button")
    // Use more specific check to avoid matching dropdown items
    const buttonText = button.querySelector(".hidden.md\\:block")
    expect(buttonText?.textContent).toBe("Thinking (Native)")
  })

  it("should have responsive text visibility", () => {
    render(
      <ButtonThink onModeChange={mockOnModeChange} hasNativeReasoning={true} />,
      {
        wrapper: createWrapper(),
      }
    )

    const text = screen.getByText("Thinking")
    expect(text.className).toContain("hidden")
    expect(text.className).toContain("md:block")
  })

  it("should handle undefined onModeChange gracefully", () => {
    render(<ButtonThink hasNativeReasoning={true} />, {
      wrapper: createWrapper(),
    })

    const disableButton = screen.getByText("Disable Thinking")

    // Should not throw an error when onModeChange is undefined
    expect(() => fireEvent.click(disableButton)).not.toThrow()
  })

  it("should default thinkingMode to 'none' when not provided", () => {
    render(
      <ButtonThink onModeChange={mockOnModeChange} hasNativeReasoning={true} />,
      {
        wrapper: createWrapper(),
      }
    )

    // The button should not have selected styles
    const button = screen.getByTestId("think-button")
    expect(button.className).not.toContain("border-[#0091FF]/20")
  })
})
