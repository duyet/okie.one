import { vi } from "vitest"

/**
 * Centralized component mocks for consistent testing
 * Use these instead of inline mocks to improve maintainability
 */

// UI Component Mocks
export const mockComponents = {
  // Code display components
  CodeBlock: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="code-block">{children}</div>
  ),
  CodeBlockCode: ({ code }: { code: string }) => (
    <pre data-testid="code-content">{code}</pre>
  ),

  // Markdown components
  Markdown: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),

  // UI primitives
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button onClick={onClick} data-testid="button" type="button">
      {children}
    </button>
  ),

  // Dropdown components
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
    <button onClick={onClick} data-testid="dropdown-item" type="button">
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),

  // Tooltip components
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}

// Icon Mocks
export const mockIcons = {
  ArrowSquareOut: () => (
    <span data-testid="icon-arrow-square-out">ArrowSquareOut</span>
  ),
  CaretDown: () => <span data-testid="icon-caret-down">CaretDown</span>,
  CaretUp: () => <span data-testid="icon-caret-up">CaretUp</span>,
  Copy: () => <span data-testid="icon-copy">Copy</span>,
  DotsThreeIcon: () => <span data-testid="icon-dots-three">DotsThreeIcon</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
}

// Hook Mocks
export const mockHooks = {
  useArtifact: () => ({
    openArtifact: vi.fn(),
    closeArtifact: vi.fn(),
    isOpen: false,
  }),
}

// Utility Mocks
export const mockUtils = {
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}

/**
 * Mock setup functions for common patterns
 */
export const setupComponentMocks = () => {
  // Code components
  vi.mock("@/components/prompt-kit/code-block", () => ({
    CodeBlock: mockComponents.CodeBlock,
    CodeBlockCode: mockComponents.CodeBlockCode,
  }))

  // Markdown components
  vi.mock("@/components/prompt-kit/markdown", () => ({
    Markdown: mockComponents.Markdown,
  }))

  // UI components
  vi.mock("@/components/ui/badge", () => ({
    Badge: mockComponents.Badge,
  }))

  vi.mock("@/components/ui/button", () => ({
    Button: mockComponents.Button,
  }))

  vi.mock("@/components/ui/dropdown-menu", () => ({
    DropdownMenu: mockComponents.DropdownMenu,
    DropdownMenuContent: mockComponents.DropdownMenuContent,
    DropdownMenuItem: mockComponents.DropdownMenuItem,
    DropdownMenuTrigger: mockComponents.DropdownMenuTrigger,
  }))

  vi.mock("@/components/ui/tooltip", () => ({
    TooltipProvider: mockComponents.TooltipProvider,
    Tooltip: mockComponents.Tooltip,
    TooltipContent: mockComponents.TooltipContent,
    TooltipTrigger: mockComponents.TooltipTrigger,
  }))

  // Icons
  vi.mock("@phosphor-icons/react", () => mockIcons)

  // Utils
  vi.mock("@/lib/utils", () => mockUtils)
}

/**
 * Mock setup for chat-specific components
 */
export const setupChatMocks = () => {
  vi.mock("@/app/components/chat/artifact-context", () => ({
    useArtifact: mockHooks.useArtifact,
  }))
}
