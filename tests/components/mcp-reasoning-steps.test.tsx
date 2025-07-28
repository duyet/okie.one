/**
 * Component tests for MCP ReasoningSteps component
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReasoningSteps } from "@/app/components/mcp/reasoning/sequential-steps"

// Mock reasoning steps data
const mockSteps = [
  {
    title: "Step 1: Analysis",
    content: "First, I need to analyze the problem...",
    nextStep: "continue" as const,
  },
  {
    title: "Step 2: Solution",
    content: "Based on the analysis, the solution is...",
    nextStep: "finalAnswer" as const,
  },
]

describe("ReasoningSteps Component", () => {
  describe("Basic Rendering", () => {
    it("should render steps correctly", () => {
      render(<ReasoningSteps steps={mockSteps} />)

      expect(
        screen.getByText("Sequential Reasoning (2 steps)")
      ).toBeInTheDocument()
    })

    it("should render empty state when no steps provided", () => {
      render(<ReasoningSteps steps={[]} />)

      expect(screen.queryByText(/Sequential Reasoning/)).not.toBeInTheDocument()
    })

    it("should not render when steps is undefined", () => {
      render(<ReasoningSteps steps={undefined as any} />)

      expect(screen.queryByText(/Sequential Reasoning/)).not.toBeInTheDocument()
    })
  })

  describe("Expandable/Collapsible Behavior", () => {
    it("should be expanded by default when streaming", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={true} />)

      // Steps content should be visible immediately
      expect(screen.getByText("Step 1: Analysis")).toBeInTheDocument()
      expect(
        screen.getByText("First, I need to analyze the problem...")
      ).toBeInTheDocument()
    })

    it("should be collapsible when not streaming", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={false} />)

      const toggleButton = screen.getByRole("button")

      // Should be collapsed initially (after streaming finished)
      expect(screen.queryByText("Step 1: Analysis")).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(toggleButton)

      // Now steps should be visible
      expect(screen.getByText("Step 1: Analysis")).toBeInTheDocument()
      expect(
        screen.getByText("First, I need to analyze the problem...")
      ).toBeInTheDocument()
    })

    it("should toggle expansion on button click", async () => {
      render(<ReasoningSteps steps={mockSteps} />)

      const toggleButton = screen.getByRole("button")

      // Initially expanded by default (no streaming state provided defaults to true)
      expect(screen.getByText("Step 1: Analysis")).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(toggleButton)

      // Wait for collapse animation
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(screen.queryByText("Step 1: Analysis")).not.toBeInTheDocument()

      // Click to expand again
      fireEvent.click(toggleButton)

      // Should be expanded again
      await screen.findByText("Step 1: Analysis")
      expect(screen.getByText("Step 1: Analysis")).toBeInTheDocument()
    })
  })

  describe("Step Content Display", () => {
    it("should display all step titles and content", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={true} />)

      expect(screen.getByText("Step 1: Analysis")).toBeInTheDocument()
      expect(
        screen.getByText("First, I need to analyze the problem...")
      ).toBeInTheDocument()
      expect(screen.getByText("Step 2: Solution")).toBeInTheDocument()
      expect(
        screen.getByText("Based on the analysis, the solution is...")
      ).toBeInTheDocument()
    })

    it("should display step numbers correctly", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={true} />)

      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
    })

    it("should preserve whitespace in step content", () => {
      const stepWithWhitespace = [
        {
          title: "Step with whitespace",
          content: "Line 1\n\nLine 3 with spaces   ",
          nextStep: "continue" as const,
        },
      ]

      render(<ReasoningSteps steps={stepWithWhitespace} isStreaming={true} />)

      const contentElement = screen.getByText(/Line 1/)
      expect(contentElement).toHaveClass("whitespace-pre-wrap")
    })
  })

  describe("Streaming Indicators", () => {
    it("should show thinking indicator on last step when streaming", () => {
      const streamingSteps = [
        {
          title: "Current Step",
          content: "Currently processing...",
          nextStep: "continue" as const,
        },
      ]

      render(<ReasoningSteps steps={streamingSteps} isStreaming={true} />)

      expect(screen.getByText("Thinking...")).toBeInTheDocument()
    })

    it("should not show thinking indicator when not streaming", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={false} />)

      // Expand to see content
      fireEvent.click(screen.getByRole("button"))

      expect(screen.queryByText("Thinking...")).not.toBeInTheDocument()
    })

    it("should not show thinking indicator if last step is finalAnswer", () => {
      const finalSteps = [
        {
          title: "Final Step",
          content: "This is the final answer",
          nextStep: "finalAnswer" as const,
        },
      ]

      render(<ReasoningSteps steps={finalSteps} isStreaming={true} />)

      expect(screen.queryByText("Thinking...")).not.toBeInTheDocument()
    })
  })

  describe("Visual Styling", () => {
    it("should have proper CSS classes for styling", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={true} />)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("flex", "items-center", "gap-1")

      // Check for step indicators
      const stepNumber = screen.getByText("1")
      expect(stepNumber).toHaveClass(
        "size-6",
        "rounded-full",
        "bg-muted-foreground/20"
      )
    })

    it("should have proper arrow rotation for expand/collapse", () => {
      render(<ReasoningSteps steps={mockSteps} />)

      const button = screen.getByRole("button")
      const arrow = button.querySelector("svg")

      // Initially expanded by default, arrow should be rotated
      expect(arrow).toHaveClass("rotate-180")

      // Click to collapse
      fireEvent.click(button)

      // Arrow should not be rotated when collapsed
      expect(arrow).not.toHaveClass("rotate-180")
    })
  })

  describe("Accessibility", () => {
    it("should have proper button attributes", () => {
      render(<ReasoningSteps steps={mockSteps} />)

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "button")
    })

    it("should support keyboard navigation", () => {
      render(<ReasoningSteps steps={mockSteps} />)

      const button = screen.getByRole("button")
      button.focus()
      expect(button).toHaveFocus()
    })

    it("should provide clear step labeling", () => {
      render(<ReasoningSteps steps={mockSteps} isStreaming={true} />)

      // Step numbers should be clearly labeled
      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
    })
  })
})
