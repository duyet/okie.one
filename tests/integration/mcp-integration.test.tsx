import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import {
  UserPreferencesProvider,
  useUserPreferences,
} from "@/lib/user-preference-store/provider"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock user store
const mockUser = {
  id: "test-user-id",
  anonymous: false,
  preferences: {
    layout: "fullscreen" as const,
    promptSuggestions: true,
    showToolInvocations: true,
    showConversationPreviews: true,
    multiModelEnabled: false,
    hiddenModels: [],
    mcpSettings: {
      "sequential-thinking": true,
    },
  },
}

vi.mock("@/lib/user-store/provider", () => ({
  useUser: () => ({ user: mockUser }),
}))

// Test wrapper component
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <UserPreferencesProvider>{children}</UserPreferencesProvider>
      </QueryClientProvider>
    )
  }
}

describe("MCP Preferences Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          layout: "fullscreen",
          prompt_suggestions: true,
          show_tool_invocations: true,
          show_conversation_previews: true,
          multi_model_enabled: false,
          hidden_models: [],
          mcp_settings: {
            "sequential-thinking": true,
          },
        }),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("isMcpServerEnabled", () => {
    test("returns correct state for existing server", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const isEnabled = result.current.isMcpServerEnabled("sequential-thinking")
      expect(isEnabled).toBe(true)
    })

    test("returns default value for unknown server", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const isEnabled = result.current.isMcpServerEnabled("unknown-server")
      expect(isEnabled).toBe(false)
    })

    test("returns true for sequential-thinking by default", async () => {
      // Mock API response without mcp_settings
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            layout: "fullscreen",
            prompt_suggestions: true,
            show_tool_invocations: true,
            show_conversation_previews: true,
            multi_model_enabled: false,
            hidden_models: [],
          }),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const isEnabled = result.current.isMcpServerEnabled("sequential-thinking")
      expect(isEnabled).toBe(true)
    })
  })

  describe("setMcpServerEnabled", () => {
    test("updates server state correctly", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Initial state
      expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
        true
      )

      // Mock API response for update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            layout: "fullscreen",
            prompt_suggestions: true,
            show_tool_invocations: true,
            show_conversation_previews: true,
            multi_model_enabled: false,
            hidden_models: [],
            mcp_settings: {
              "sequential-thinking": false,
            },
          }),
      })

      // Update the setting
      await act(async () => {
        result.current.setMcpServerEnabled("sequential-thinking", false)
      })

      await waitFor(() => {
        expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
          false
        )
      })

      // Verify API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith("/api/user-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcp_settings: {
            "sequential-thinking": false,
          },
        }),
      })
    })

    test("enables new server while preserving existing settings", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock API response for update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            layout: "fullscreen",
            prompt_suggestions: true,
            show_tool_invocations: true,
            show_conversation_previews: true,
            multi_model_enabled: false,
            hidden_models: [],
            mcp_settings: {
              "sequential-thinking": true,
              "new-server": true,
            },
          }),
      })

      // Enable new server
      await act(async () => {
        result.current.setMcpServerEnabled("new-server", true)
      })

      await waitFor(() => {
        expect(result.current.isMcpServerEnabled("new-server")).toBe(true)
        expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
          true
        )
      })

      // Verify API was called with both settings
      expect(mockFetch).toHaveBeenCalledWith("/api/user-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcp_settings: {
            "sequential-thinking": true,
            "new-server": true,
          },
        }),
      })
    })

    test("handles API errors gracefully", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const initialState = result.current.isMcpServerEnabled(
        "sequential-thinking"
      )

      // Attempt to update (should fail)
      await act(async () => {
        result.current.setMcpServerEnabled("sequential-thinking", false)
      })

      // State should remain unchanged after error
      await waitFor(() => {
        expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
          initialState
        )
      })
    })
  })

  describe("localStorage fallback for anonymous users", () => {
    beforeEach(() => {
      // Mock anonymous user
      vi.doMock("@/lib/user-store/provider", () => ({
        useUser: () => ({
          user: { id: "anon-id", anonymous: true },
        }),
      }))

      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
        writable: true,
      })
    })

    test("uses localStorage for anonymous users", async () => {
      // Mock localStorage to return stored preferences
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          layout: "fullscreen",
          promptSuggestions: true,
          showToolInvocations: true,
          showConversationPreviews: true,
          multiModelEnabled: false,
          hiddenModels: [],
          mcpSettings: {
            "sequential-thinking": false,
          },
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
        false
      )

      // Should not call API for anonymous users
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test("saves to localStorage when updating preferences for anonymous users", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        result.current.setMcpServerEnabled("sequential-thinking", false)
      })

      // Should save to localStorage instead of API
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "user-preferences",
        expect.stringContaining('"mcpSettings"')
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("optimistic updates", () => {
    test("updates state immediately before API call", async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useUserPreferences(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock slow API response
      let resolveApiCall: (value: Response) => void = () => {}
      const apiPromise = new Promise<Response>((resolve) => {
        resolveApiCall = resolve
      })
      mockFetch.mockReturnValue(apiPromise)

      expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
        true
      )

      // Start the update
      act(() => {
        result.current.setMcpServerEnabled("sequential-thinking", false)
      })

      // State should update immediately (optimistic)
      expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
        false
      )

      // Resolve the API call
      resolveApiCall({
        ok: true,
        json: () =>
          Promise.resolve({
            layout: "fullscreen",
            prompt_suggestions: true,
            show_tool_invocations: true,
            show_conversation_previews: true,
            multi_model_enabled: false,
            hidden_models: [],
            mcp_settings: {
              "sequential-thinking": false,
            },
          }),
      } as Response)

      await waitFor(() => {
        expect(result.current.isMcpServerEnabled("sequential-thinking")).toBe(
          false
        )
      })
    })
  })
})
