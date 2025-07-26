/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ContentPart } from "@/app/types/api.types"

// Mock all dependencies
vi.mock("@/components/prompt-kit/code-block", () => ({
  CodeBlock: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="code-block">{children}</div>
  ),
  CodeBlockCode: ({ code }: { code: string }) => (
    <pre data-testid="code-content">{code}</pre>
  ),
}))

vi.mock("@/components/prompt-kit/markdown", () => ({
  Markdown: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}))

vi.mock("@/app/components/chat/artifact-context", () => ({
  useArtifact: () => ({
    openArtifact: vi.fn(),
  }),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => <div onClick={onClick} role="button" tabIndex={0}>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}))

vi.mock("@phosphor-icons/react", () => ({
  ArrowSquareOut: () => <span>ArrowSquareOut</span>,
  CaretDown: () => <span>CaretDown</span>,
  CaretUp: () => <span>CaretUp</span>,
  Copy: () => <span>Copy</span>,
  DotsThreeIcon: () => <span>DotsThreeIcon</span>,
  Download: () => <span>Download</span>,
}))

// Import after mocking
import { ArtifactDisplay } from "@/app/components/chat/artifact-display"

describe("ArtifactDisplay - Simple Test", () => {
  const createMockArtifact = (): NonNullable<ContentPart["artifact"]> => ({
    id: "art_test_123",
    type: "code",
    title: "Test Artifact",
    content: "console.log('Hello World')",
    language: "javascript",
    metadata: {
      size: 45,
      lines: 3,
      created: "2024-01-15T10:30:00Z",
    },
  })

  it("should render basic artifact display", () => {
    const artifact = createMockArtifact()
    render(<ArtifactDisplay artifact={artifact} />)

    expect(screen.getByText("Test Artifact")).toBeInTheDocument()
    expect(screen.getByTestId("badge")).toBeInTheDocument()
    expect(screen.getByTestId("code-block")).toBeInTheDocument()
  })
})
