/**
 * Component tests for MCP ToolInvocation component
 */

import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ToolInvocation } from "@/app/components/mcp/tools/tool-invocation"

// Mock tool invocation data
const mockToolInvocation: ToolInvocationUIPart = {
  type: "tool-invocation",
  toolInvocation: {
    state: "result",
    toolName: "addReasoningStep",
    toolCallId: "test-call-id",
    args: {
      title: "Test Step",
      content: "This is a test reasoning step",
      nextStep: "continue",
    },
    result: {
      title: "Test Step",
      content: "This is a test reasoning step",
      nextStep: "continue",
    },
  },
}

const mockLoadingToolInvocation: ToolInvocationUIPart = {
  type: "tool-invocation",
  toolInvocation: {
    state: "call",
    toolName: "addReasoningStep",
    toolCallId: "loading-call-id",
    args: {
      title: "Loading Step",
      content: "Processing...",
      nextStep: "continue",
    },
  },
}

describe("ToolInvocation Component", () => {
  describe("Single Tool Display", () => {
    it("should render single tool invocation correctly", () => {
      render(
        <ToolInvocation
          toolInvocations={[mockToolInvocation]}
          defaultOpen={true}
        />
      )

      expect(screen.getByText("addReasoningStep")).toBeInTheDocument()
      expect(screen.getByText("Completed")).toBeInTheDocument()
      expect(screen.getByText("test-call-id")).toBeInTheDocument()
    })

    it("should show loading state for in-progress tools", () => {
      render(<ToolInvocation toolInvocations={[mockLoadingToolInvocation]} />)

      expect(screen.getByText("addReasoningStep")).toBeInTheDocument()
      expect(screen.getByText("Running")).toBeInTheDocument()
    })

    it("should be expandable and collapsible", async () => {
      render(<ToolInvocation toolInvocations={[mockToolInvocation]} />)

      const expandButton = screen.getByRole("button")

      // Initially collapsed - arguments and results should not be visible
      expect(screen.queryByText("Arguments")).not.toBeInTheDocument()
      expect(screen.queryByText("Result")).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(expandButton)

      // Wait for animation and check if expanded
      await screen.findByText("Arguments")
      expect(screen.getByText("Arguments")).toBeInTheDocument()
      expect(screen.getByText("Result")).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(expandButton)

      // Wait for collapse animation
      // The content should be hidden after animation
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(screen.queryByText("Arguments")).not.toBeInTheDocument()
      expect(screen.queryByText("Result")).not.toBeInTheDocument()
    })

    it("should display arguments correctly", () => {
      render(
        <ToolInvocation
          toolInvocations={[mockToolInvocation]}
          defaultOpen={true}
        />
      )

      expect(screen.getByText("Arguments")).toBeInTheDocument()
      expect(screen.getByText("title:")).toBeInTheDocument()
      expect(screen.getByText("Test Step")).toBeInTheDocument()
      expect(screen.getByText("content:")).toBeInTheDocument()
      expect(
        screen.getByText("This is a test reasoning step")
      ).toBeInTheDocument()
      expect(screen.getByText("nextStep:")).toBeInTheDocument()
      expect(screen.getByText("continue")).toBeInTheDocument()
    })

    it("should display results correctly", () => {
      render(
        <ToolInvocation
          toolInvocations={[mockToolInvocation]}
          defaultOpen={true}
        />
      )

      expect(screen.getByText("Result")).toBeInTheDocument()
      // Results should be displayed as formatted content
      expect(screen.getByText(/Test Step/)).toBeInTheDocument()
      expect(
        screen.getByText(/This is a test reasoning step/)
      ).toBeInTheDocument()
    })
  })

  describe("Multiple Tools Display", () => {
    const multipleTools: ToolInvocationUIPart[] = [
      mockToolInvocation,
      {
        ...mockLoadingToolInvocation,
        toolInvocation: {
          ...mockLoadingToolInvocation.toolInvocation,
          toolCallId: "second-call-id",
        },
      },
    ]

    it("should render multiple tools with summary header", () => {
      render(<ToolInvocation toolInvocations={multipleTools} />)

      expect(screen.getByText("Tools executed")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument() // Count badge
    })

    it("should expand to show individual tools", () => {
      render(<ToolInvocation toolInvocations={multipleTools} />)

      const expandButton = screen.getByRole("button", {
        name: /tools executed/i,
      })

      // Initially collapsed - individual tools not visible
      expect(screen.queryByText("addReasoningStep")).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(expandButton)

      // Now individual tools should be visible
      const toolElements = screen.getAllByText("addReasoningStep")
      expect(toolElements).toHaveLength(2)
    })
  })

  describe("Tool Result Parsing", () => {
    it("should handle string results", () => {
      const toolWithStringResult: ToolInvocationUIPart = {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          toolName: "testTool",
          toolCallId: "string-result-id",
          args: {},
          result: "Simple string result",
        },
      }

      render(
        <ToolInvocation
          toolInvocations={[toolWithStringResult]}
          defaultOpen={true}
        />
      )

      expect(screen.getByText("Simple string result")).toBeInTheDocument()
    })

    it("should handle array results (like search results)", () => {
      const toolWithArrayResult: ToolInvocationUIPart = {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          toolName: "searchTool",
          toolCallId: "array-result-id",
          args: {},
          result: [
            {
              url: "https://example.com",
              title: "Example Result",
              snippet: "This is an example snippet",
            },
          ],
        },
      }

      render(
        <ToolInvocation
          toolInvocations={[toolWithArrayResult]}
          defaultOpen={true}
        />
      )

      expect(screen.getByText("Example Result")).toBeInTheDocument()
      expect(screen.getByText("https://example.com")).toBeInTheDocument()
      expect(screen.getByText("This is an example snippet")).toBeInTheDocument()
    })

    it("should handle malformed results gracefully", () => {
      const toolWithMalformedResult: ToolInvocationUIPart = {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          toolName: "malformedTool",
          toolCallId: "malformed-result-id",
          args: {},
          result: null,
        },
      }

      render(
        <ToolInvocation
          toolInvocations={[toolWithMalformedResult]}
          defaultOpen={true}
        />
      )

      expect(screen.getByText("No result data available")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<ToolInvocation toolInvocations={[mockToolInvocation]} />)

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "button")
    })

    it("should support keyboard navigation", () => {
      render(<ToolInvocation toolInvocations={[mockToolInvocation]} />)

      const button = screen.getByRole("button")
      button.focus()
      expect(button).toHaveFocus()
    })
  })
})
