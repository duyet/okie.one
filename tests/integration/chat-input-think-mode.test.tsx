import { render, screen, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { TooltipProvider } from "@/components/ui/tooltip"

// Mock the model info function
vi.mock("@/lib/models", () => ({
  getModelInfo: vi.fn((modelId: string) => {
    // Return different model configs based on modelId
    if (modelId === "claude-3.5-sonnet") {
      return {
        id: "claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        provider: "Anthropic",
        reasoning: true,
        webSearch: false,
        vision: true,
        tools: true,
      }
    }
    if (modelId === "gpt-4o") {
      return {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "OpenAI",
        reasoning: false,
        webSearch: true,
        vision: true,
        tools: true,
      }
    }
    if (modelId === "deepseek-reasoner") {
      return {
        id: "deepseek-reasoner",
        name: "DeepSeek Reasoner",
        provider: "DeepSeek",
        reasoning: true,
        webSearch: false,
        vision: false,
        tools: false,
      }
    }
    return null
  }),
}))

// Mock file handling
vi.mock("@/lib/file-handling", () => ({
  validateModelSupportsFiles: vi.fn(() => false),
  getModelFileCapabilities: vi.fn(() => null),
}))

// Mock config
vi.mock("@/lib/config", () => ({
  APP_NAME: "Okie",
}))

// Mock Supabase config
vi.mock("@/lib/supabase/config", () => ({
  isSupabaseEnabledClient: false,
  isSupabaseEnabled: false,
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

// Mock the ModelSelector component
vi.mock("@/components/common/model-selector/base", () => ({
  ModelSelector: ({
    selectedModelId,
    setSelectedModelId,
  }: {
    selectedModelId: string
    setSelectedModelId: (model: string) => void
  }) => (
    <select
      data-testid="model-selector"
      value={selectedModelId}
      onChange={(e) => setSelectedModelId(e.target.value)}
    >
      <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
      <option value="gpt-4o">GPT-4o</option>
      <option value="deepseek-reasoner">DeepSeek Reasoner</option>
    </select>
  ),
}))

// Mock the prompt kit components
vi.mock("@/components/prompt-kit/prompt-input", () => ({
  PromptInput: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="prompt-input">{children}</div>
  ),
  PromptInputTextarea: (props: any) => (
    <textarea data-testid="prompt-textarea" {...props} />
  ),
  PromptInputActions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="prompt-actions">{children}</div>
  ),
  PromptInputAction: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="prompt-action">{children}</div>
  ),
}))

// Mock other components
vi.mock("@/app/components/chat-input/button-file-upload", () => ({
  ButtonFileUpload: () => (
    <button type="button" data-testid="file-upload-button">Upload</button>
  ),
}))

vi.mock("@/app/components/chat-input/button-search", () => ({
  ButtonSearch: ({
    isSelected,
    onToggle,
  }: {
    isSelected: boolean
    onToggle: (selected: boolean) => void
  }) => (
    <button
      type="button"
      data-testid="search-button"
      onClick={() => onToggle(!isSelected)}
      className={isSelected ? "selected" : ""}
    >
      Search
    </button>
  ),
}))

vi.mock("@/app/components/chat-input/file-list", () => ({
  FileList: () => <div data-testid="file-list">File List</div>,
}))

vi.mock("@/app/components/suggestions/prompt-system", () => ({
  PromptSystem: () => <div data-testid="prompt-system">Suggestions</div>,
}))

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>{children}</TooltipProvider>
  )
}

describe("ChatInput Think Mode Integration", () => {
  const defaultProps = {
    value: "",
    onValueChange: vi.fn(),
    onSend: vi.fn(),
    isSubmitting: false,
    files: [],
    onFileUpload: vi.fn(),
    onFileRemove: vi.fn(),
    onSuggestion: vi.fn(),
    hasSuggestions: false,
    onSelectModel: vi.fn(),
    selectedModel: "claude-3.5-sonnet",
    isUserAuthenticated: true,
    stop: vi.fn(),
    status: "ready" as const,
    setEnableSearch: vi.fn(),
    enableSearch: false,
    setEnableThink: vi.fn(),
    enableThink: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Think button visibility", () => {
    it("should show think button for reasoning-capable models", () => {
      render(
        <ChatInput {...defaultProps} selectedModel="claude-3.5-sonnet" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId("think-button")).toBeDefined()
    })

    it("should show think button for DeepSeek reasoner model", () => {
      render(
        <ChatInput {...defaultProps} selectedModel="deepseek-reasoner" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId("think-button")).toBeDefined()
    })

    it("should hide think button for non-reasoning models", () => {
      render(<ChatInput {...defaultProps} selectedModel="gpt-4o" />, {
        wrapper: createWrapper(),
      })

      expect(screen.queryByTestId("think-button")).toBeNull()
    })
  })

  describe("Think button functionality", () => {
    it("should call setEnableThink when think button is clicked", () => {
      const mockSetEnableThink = vi.fn()

      render(
        <ChatInput
          {...defaultProps}
          selectedModel="claude-3.5-sonnet"
          setEnableThink={mockSetEnableThink}
          enableThink={false}
        />,
        { wrapper: createWrapper() }
      )

      const thinkButton = screen.getByTestId("think-button")
      fireEvent.click(thinkButton)

      expect(mockSetEnableThink).toHaveBeenCalledWith(true)
    })

    it("should toggle think state correctly", () => {
      const mockSetEnableThink = vi.fn()

      const { rerender } = render(
        <ChatInput
          {...defaultProps}
          selectedModel="claude-3.5-sonnet"
          setEnableThink={mockSetEnableThink}
          enableThink={false}
        />,
        { wrapper: createWrapper() }
      )

      const thinkButton = screen.getByTestId("think-button")
      fireEvent.click(thinkButton)
      expect(mockSetEnableThink).toHaveBeenCalledWith(true)

      // Simulate state change
      rerender(
        <ChatInput
          {...defaultProps}
          selectedModel="claude-3.5-sonnet"
          setEnableThink={mockSetEnableThink}
          enableThink={true}
        />
      )

      fireEvent.click(thinkButton)
      expect(mockSetEnableThink).toHaveBeenCalledWith(false)
    })

    it("should show selected state when think mode is enabled", () => {
      render(
        <ChatInput
          {...defaultProps}
          selectedModel="claude-3.5-sonnet"
          enableThink={true}
        />,
        { wrapper: createWrapper() }
      )

      const thinkButton = screen.getByTestId("think-button")
      expect(thinkButton.className).toContain("border-[#0091FF]/20")
    })
  })

  describe("Auto-disable functionality", () => {
    it("should disable think mode when switching to non-reasoning model", () => {
      const mockSetEnableThink = vi.fn()

      const { rerender } = render(
        <ChatInput
          {...defaultProps}
          selectedModel="claude-3.5-sonnet"
          setEnableThink={mockSetEnableThink}
          enableThink={true}
        />,
        { wrapper: createWrapper() }
      )

      // Switch to non-reasoning model
      rerender(
        <ChatInput
          {...defaultProps}
          selectedModel="gpt-4o"
          setEnableThink={mockSetEnableThink}
          enableThink={true}
        />
      )

      // Should auto-disable think mode
      expect(mockSetEnableThink).toHaveBeenCalledWith(false)
    })

    it("should not auto-disable if already disabled", () => {
      const mockSetEnableThink = vi.fn()

      render(
        <ChatInput
          {...defaultProps}
          selectedModel="gpt-4o"
          setEnableThink={mockSetEnableThink}
          enableThink={false}
        />,
        { wrapper: createWrapper() }
      )

      // Should not call setEnableThink when already disabled
      expect(mockSetEnableThink).not.toHaveBeenCalled()
    })
  })

  describe("Layout structure", () => {
    it("should have correct layout with think button on left side", () => {
      render(
        <ChatInput {...defaultProps} selectedModel="claude-3.5-sonnet" />,
        { wrapper: createWrapper() }
      )

      const promptActions = screen.getByTestId("prompt-actions")
      const leftSide = promptActions.children[0]
      const rightSide = promptActions.children[1]

      // Left side should contain file upload and think button
      expect(
        leftSide.querySelector('[data-testid="file-upload-button"]')
      ).toBeTruthy()
      expect(
        leftSide.querySelector('[data-testid="think-button"]')
      ).toBeTruthy()

      // Right side should contain model selector and send button
      expect(
        rightSide.querySelector('[data-testid="model-selector"]')
      ).toBeTruthy()
      expect(
        rightSide.querySelector('[data-testid="prompt-action"]')
      ).toBeTruthy()
    })

    it("should show search button when model supports it", () => {
      render(
        <ChatInput
          {...defaultProps}
          selectedModel="gpt-4o" // Has webSearch: true
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId("search-button")).toBeDefined()
    })

    it("should hide search button when model doesn't support it", () => {
      render(
        <ChatInput
          {...defaultProps}
          selectedModel="deepseek-reasoner" // Has webSearch: false
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByTestId("search-button")).toBeNull()
    })
  })

  describe("Authentication handling", () => {
    it("should show auth popover for unauthenticated users", () => {
      render(
        <ChatInput
          {...defaultProps}
          selectedModel="claude-3.5-sonnet"
          isUserAuthenticated={false}
        />,
        { wrapper: createWrapper() }
      )

      // Think button should still be present but show auth popover
      expect(screen.getByTestId("think-button")).toBeDefined()
    })
  })

  describe("Edge cases", () => {
    it("should handle undefined model gracefully", () => {
      render(<ChatInput {...defaultProps} selectedModel="unknown-model" />, {
        wrapper: createWrapper(),
      })

      // Should not crash and not show think button for unknown model
      expect(screen.queryByTestId("think-button")).toBeNull()
    })

    it("should handle missing setEnableThink prop gracefully", () => {
      const propsWithoutSetThink = { ...defaultProps }
      delete (propsWithoutSetThink as any).setEnableThink

      expect(() => {
        render(
          <ChatInput
            {...propsWithoutSetThink}
            selectedModel="claude-3.5-sonnet"
          />,
          { wrapper: createWrapper() }
        )
      }).not.toThrow()
    })
  })
})
