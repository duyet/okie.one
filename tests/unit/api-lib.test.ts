import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies
vi.mock("@/lib/config", () => ({
  APP_DOMAIN: "https://okie.one",
}))

vi.mock("@/lib/fetch", () => ({
  fetchClient: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/routes", () => ({
  API_ROUTE_CREATE_GUEST: "/api/create-guest",
  API_ROUTE_UPDATE_CHAT_MODEL: "/api/update-chat-model",
}))

describe("API Library", () => {
  const originalEnv = { ...process.env }
  const originalWindow = global.window

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment for each test
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    global.window = originalWindow
  })

  describe("OAuth Base URL Detection", () => {
    it("should return localhost for development environment", async () => {
      // Test environment defaults to localhost, so this test validates default behavior
      const mockSupabase = {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      }

      const { signInWithGoogle } = await import("@/lib/api")
      await signInWithGoogle(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >
      )

      // In test environment, should default to localhost
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })
    })

    it("should handle OAuth sign-in successfully", async () => {
      // Test the core OAuth functionality regardless of environment
      const mockSupabase = {
        auth: {
          signInWithOAuth: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: "123" } }, error: null }),
        },
      }

      const { signInWithGoogle } = await import("@/lib/api")
      const result = await signInWithGoogle(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >
      )

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringContaining("/auth/callback"),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })
      expect((result as unknown as { user: { id: string } }).user.id).toBe(
        "123"
      )
    })

    it("should handle GitHub OAuth sign-in successfully", async () => {
      // Test the core GitHub OAuth functionality
      const mockSupabase = {
        auth: {
          signInWithOAuth: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: "456" } }, error: null }),
        },
      }

      const { signInWithGitHub } = await import("@/lib/api")
      const result = await signInWithGitHub(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >
      )

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "github",
        options: {
          redirectTo: expect.stringContaining("/auth/callback"),
        },
      })
      expect((result as unknown as { user: { id: string } }).user.id).toBe(
        "456"
      )
    })

    it("should use window.location.origin as fallback", async () => {
      const _originalNodeEnv = process.env.NODE_ENV
      const _originalVercelEnv = process.env.VERCEL_ENV
      delete (process.env as { NODE_ENV?: string }).NODE_ENV
      delete (process.env as { VERCEL_ENV?: string }).VERCEL_ENV

      // Mock window object
      global.window = {
        location: {
          origin: "https://custom-domain.com",
          hostname: "custom-domain.com",
          href: "https://custom-domain.com",
        },
      } as typeof window

      const mockSupabase = {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      }

      const { signInWithGitHub } = await import("@/lib/api")
      await signInWithGitHub(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >
      )

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "github",
        options: {
          redirectTo: "https://custom-domain.com/auth/callback",
        },
      })
    })
  })

  describe("createGuestUser()", () => {
    it("should successfully create a guest user", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "guest-123", created: true }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { createGuestUser } = await import("@/lib/api")
      const result = await createGuestUser("guest-123")

      expect(mockFetchClient).toHaveBeenCalledWith("/api/create-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "guest-123" }),
      })
      expect(result).toEqual({ id: "guest-123", created: true })
    })

    it("should handle API errors gracefully", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: vi.fn().mockResolvedValue({ error: "Invalid user ID" }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { createGuestUser } = await import("@/lib/api")

      await expect(createGuestUser("invalid-id")).rejects.toThrow(
        "Invalid user ID"
      )
    })

    it("should handle network errors", async () => {
      const mockFetchClient = vi
        .fn()
        .mockRejectedValue(new Error("Network error"))

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { createGuestUser } = await import("@/lib/api")

      await expect(createGuestUser("guest-123")).rejects.toThrow(
        "Network error"
      )
    })
  })

  describe("UsageLimitError", () => {
    it("should create error with correct properties", async () => {
      const { UsageLimitError } = await import("@/lib/api")

      const error = new UsageLimitError("Daily limit exceeded")

      expect(error.message).toBe("Daily limit exceeded")
      expect(error.code).toBe("DAILY_LIMIT_REACHED")
      expect(error instanceof Error).toBe(true)
    })
  })

  describe("checkRateLimits()", () => {
    it("should check rate limits for authenticated user", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ remaining: 950, limit: 1000 }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { checkRateLimits } = await import("@/lib/api")
      const result = await checkRateLimits("user-123", true)

      expect(mockFetchClient).toHaveBeenCalledWith(
        "/api/rate-limits?userId=user-123&isAuthenticated=true",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )
      expect(result).toEqual({ remaining: 950, limit: 1000 })
    })

    it("should check rate limits for guest user", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ remaining: 3, limit: 5 }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { checkRateLimits } = await import("@/lib/api")
      const result = await checkRateLimits("guest-456", false)

      expect(mockFetchClient).toHaveBeenCalledWith(
        "/api/rate-limits?userId=guest-456&isAuthenticated=false",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )
      expect(result).toEqual({ remaining: 3, limit: 5 })
    })

    it("should handle rate limit errors", async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: vi.fn().mockResolvedValue({ error: "Rate limit exceeded" }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { checkRateLimits } = await import("@/lib/api")

      await expect(checkRateLimits("user-123", true)).rejects.toThrow(
        "Rate limit exceeded"
      )
    })
  })

  describe("updateChatModel()", () => {
    it("should successfully update chat model", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          chatId: "chat-123",
          model: "gpt-4",
          updated: true,
        }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { updateChatModel } = await import("@/lib/api")
      const result = await updateChatModel("chat-123", "gpt-4")

      expect(mockFetchClient).toHaveBeenCalledWith("/api/update-chat-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: "chat-123", model: "gpt-4" }),
      })
      expect(result).toEqual({
        chatId: "chat-123",
        model: "gpt-4",
        updated: true,
      })
    })

    it("should handle update errors", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: vi.fn().mockResolvedValue({ error: "Chat not found" }),
      }
      const mockFetchClient = vi.fn().mockResolvedValue(mockResponse)

      vi.doMock("@/lib/fetch", () => ({
        fetchClient: mockFetchClient,
      }))

      vi.resetModules()
      const { updateChatModel } = await import("@/lib/api")

      await expect(updateChatModel("invalid-chat", "gpt-4")).rejects.toThrow(
        "Chat not found"
      )
    })
  })

  describe("OAuth Sign-in Functions", () => {
    it("should handle OAuth errors gracefully", async () => {
      const mockSupabase = {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("OAuth provider error"),
          }),
        },
      }

      const { signInWithGoogle } = await import("@/lib/api")

      await expect(
        signInWithGoogle(
          mockSupabase as unknown as NonNullable<
            ReturnType<typeof import("@/lib/supabase/client").createClient>
          >
        )
      ).rejects.toThrow("OAuth provider error")
    })

    it("should handle network errors during OAuth", async () => {
      const mockSupabase = {
        auth: {
          signInWithOAuth: vi
            .fn()
            .mockRejectedValue(new Error("Network timeout")),
        },
      }

      const { signInWithGitHub } = await import("@/lib/api")

      await expect(
        signInWithGitHub(
          mockSupabase as unknown as NonNullable<
            ReturnType<typeof import("@/lib/supabase/client").createClient>
          >
        )
      ).rejects.toThrow("Network timeout")
    })
  })

  describe("Environment Edge Cases", () => {
    it("should generate valid redirect URLs", async () => {
      // Test that redirect URLs are always valid
      const mockSupabase = {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      }

      const { signInWithGoogle } = await import("@/lib/api")
      await signInWithGoogle(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >
      )

      const callArgs = mockSupabase.auth.signInWithOAuth.mock.calls[0][0]
      const redirectTo = callArgs.options.redirectTo

      // Should be a valid URL that ends with /auth/callback
      expect(redirectTo).toMatch(/^https?:\/\/.+\/auth\/callback$/)
      expect(redirectTo).toContain("/auth/callback")
    })
  })
})
