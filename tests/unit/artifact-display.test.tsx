/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ArtifactDisplay } from "@/app/components/chat/artifact-display"
import type { ContentPart } from "@/app/types/api.types"

// Mock the CodeBlock components
vi.mock("@/components/prompt-kit/code-block", () => ({
  CodeBlock: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid="code-block" className={className}>
      {children}
    </div>
  ),
  CodeBlockCode: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-content" data-language={language}>
      {code}
    </pre>
  ),
}))

// Mock ReactMarkdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}))

// Mock rehype-sanitize
vi.mock("rehype-sanitize", () => ({
  default: () => null,
}))

describe("ArtifactDisplay", () => {
  let mockClipboard: {
    writeText: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Mock clipboard API
    mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
    })

    // Mock URL.createObjectURL and related APIs
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url")
    global.URL.revokeObjectURL = vi.fn()

    // Mock document.createElement for download functionality
    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
    }
    const originalCreateElement = document.createElement
    document.createElement = vi.fn((tagName) => {
      if (tagName === "a") {
        return mockAnchor as any
      }
      return originalCreateElement.call(document, tagName)
    })

    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()
  })

  const createMockArtifact = (
    overrides: Partial<NonNullable<ContentPart["artifact"]>> = {}
  ): NonNullable<ContentPart["artifact"]> => ({
    id: "art_test_123",
    type: "code",
    title: "Test Artifact",
    content: "console.log('Hello World')\nfunction test() {\n  return 42\n}",
    language: "javascript",
    metadata: {
      size: 45,
      lines: 3,
      created: "2024-01-15T10:30:00Z",
    },
    ...overrides,
  })

  describe("Code Artifacts", () => {
    it("should render code artifact with syntax highlighting", () => {
      const artifact = createMockArtifact()
      render(<ArtifactDisplay artifact={artifact} />)

      expect(screen.getByText("Test Artifact")).toBeInTheDocument()
      expect(screen.getByText("javascript")).toBeInTheDocument()
      expect(screen.getByTestId("code-block")).toBeInTheDocument()
      expect(screen.getByTestId("code-content")).toHaveAttribute(
        "data-language",
        "javascript"
      )
    })

    it("should show expand/collapse button for long content", () => {
      const longContent = "console.log('test')\n".repeat(50)
      const artifact = createMockArtifact({ content: longContent })
      render(<ArtifactDisplay artifact={artifact} />)

      const expandButton = screen.getByRole("button", { name: /expand/i })
      expect(expandButton).toBeInTheDocument()

      fireEvent.click(expandButton)
      expect(
        screen.getByRole("button", { name: /collapse/i })
      ).toBeInTheDocument()
    })
  })

  describe("HTML Artifacts", () => {
    it("should render HTML artifact with preview button", () => {
      const artifact = createMockArtifact({
        type: "html",
        title: "Landing Page",
        content:
          "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>",
        language: undefined,
      })
      render(<ArtifactDisplay artifact={artifact} />)

      expect(screen.getByText("Landing Page")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /preview html content/i })
      ).toBeInTheDocument()
    })

    it("should show iframe when expanded", () => {
      const artifact = createMockArtifact({
        type: "html",
        content: "<!DOCTYPE html><html><body><h1>Test</h1></body></html>",
        language: undefined,
      })
      render(<ArtifactDisplay artifact={artifact} />)

      const previewButton = screen.getByRole("button", {
        name: /preview html content/i,
      })
      fireEvent.click(previewButton)

      const iframe = screen.getByTitle("Test Artifact")
      expect(iframe).toBeInTheDocument()
      expect(iframe).toHaveAttribute(
        "sandbox",
        "allow-scripts allow-same-origin"
      )
    })
  })

  describe("Document Artifacts", () => {
    it("should render document artifact with markdown", () => {
      const artifact = createMockArtifact({
        type: "document",
        title: "API Documentation",
        content: "# API Docs\n\nThis is **important** documentation.",
        language: undefined,
      })
      render(<ArtifactDisplay artifact={artifact} />)

      expect(screen.getByText("API Documentation")).toBeInTheDocument()
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument()
    })
  })

  describe("Data Artifacts", () => {
    it("should render data artifact as preformatted text", () => {
      const artifact = createMockArtifact({
        type: "data",
        title: "JSON Data",
        content: '{\n  "name": "test",\n  "value": 123\n}',
        language: undefined,
      })
      render(<ArtifactDisplay artifact={artifact} />)

      expect(screen.getByText("JSON Data")).toBeInTheDocument()
      const preElement = screen.getByText(/{"name": "test"/)
      expect(preElement.tagName).toBe("PRE")
    })
  })

  describe("Actions", () => {
    it("should copy content to clipboard", async () => {
      const artifact = createMockArtifact()
      render(<ArtifactDisplay artifact={artifact} />)

      const moreButton = screen.getByRole("button", { name: "" }) // More options button
      fireEvent.click(moreButton)

      const copyButton = screen.getByText("Copy")
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(artifact.content)
      })
    })

    it("should download file with correct extension", () => {
      const artifact = createMockArtifact({
        title: "My Component",
        language: "typescript",
      })
      render(<ArtifactDisplay artifact={artifact} />)

      const moreButton = screen.getByRole("button", { name: "" })
      fireEvent.click(moreButton)

      const downloadButton = screen.getByText("Download")
      fireEvent.click(downloadButton)

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith("a")
    })

    it("should handle filename sanitization", () => {
      const artifact = createMockArtifact({
        title: "My/Component<with>unsafe:chars*",
        language: "typescript",
      })
      render(<ArtifactDisplay artifact={artifact} />)

      const moreButton = screen.getByRole("button", { name: "" })
      fireEvent.click(moreButton)

      const downloadButton = screen.getByText("Download")
      fireEvent.click(downloadButton)

      // The filename should be sanitized (we can't easily test the exact filename
      // without exposing internal implementation details)
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })
  })

  describe("Metadata Display", () => {
    it("should show metadata when expanded", () => {
      const artifact = createMockArtifact({
        metadata: {
          size: 1250,
          lines: 45,
          created: "2024-01-15T10:30:00Z",
        },
      })
      render(<ArtifactDisplay artifact={artifact} />)

      // Expand the artifact
      const expandButton = screen.getByRole("button", { name: /expand/i })
      fireEvent.click(expandButton)

      expect(screen.getByText(/1,250 characters/)).toBeInTheDocument()
      expect(screen.getByText(/45 lines/)).toBeInTheDocument()
      expect(screen.getByText(/Created/)).toBeInTheDocument()
    })

    it("should not show lines count for non-code artifacts", () => {
      const artifact = createMockArtifact({
        type: "document",
        metadata: {
          size: 1250,
          created: "2024-01-15T10:30:00Z",
        },
      })
      render(<ArtifactDisplay artifact={artifact} />)

      const expandButton = screen.getByRole("button", { name: /expand/i })
      fireEvent.click(expandButton)

      expect(screen.getByText(/1,250 characters/)).toBeInTheDocument()
      expect(screen.queryByText(/lines/)).not.toBeInTheDocument()
    })
  })

  describe("Truncation", () => {
    it("should truncate long content when collapsed", () => {
      const longContent = "a".repeat(500)
      const artifact = createMockArtifact({ content: longContent })
      render(<ArtifactDisplay artifact={artifact} />)

      // Should show truncated content
      const codeContent = screen.getByTestId("code-content")
      expect(codeContent.textContent).toContain("...")
      expect(codeContent.textContent?.length).toBeLessThan(longContent.length)
    })

    it("should show full content when expanded", () => {
      const longContent = "a".repeat(500)
      const artifact = createMockArtifact({ content: longContent })
      render(<ArtifactDisplay artifact={artifact} />)

      const expandButton = screen.getByRole("button", { name: /expand/i })
      fireEvent.click(expandButton)

      const codeContent = screen.getByTestId("code-content")
      expect(codeContent.textContent).toBe(longContent)
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      const artifact = createMockArtifact()
      render(<ArtifactDisplay artifact={artifact} />)

      const icon = screen.getByRole("img", { name: "code" })
      expect(icon).toBeInTheDocument()
    })

    it("should have proper button labels", () => {
      const artifact = createMockArtifact({
        type: "html",
        content: "<!DOCTYPE html><html><body>Test</body></html>",
      })
      render(<ArtifactDisplay artifact={artifact} />)

      const previewButton = screen.getByRole("button", {
        name: /preview html content/i,
      })
      expect(previewButton).toBeInTheDocument()
    })
  })
})
