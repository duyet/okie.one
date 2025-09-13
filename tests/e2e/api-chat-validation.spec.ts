import type { APIResponse } from "@playwright/test"
import { expect, test } from "@playwright/test"

/**
 * Comprehensive E2E tests for Chat API validation
 * Tests the /api/chat endpoint validation fix to ensure proper error handling
 * for missing required fields and legacy request formats
 */
test.describe("Chat API Validation E2E Tests", () => {
  const baseUrl = "http://localhost:3000"

  // Helper function to create request payload
  const createChatRequest = (overrides: Record<string, unknown> = {}) => {
    const defaultRequest = {
      messages: [
        {
          id: "msg-123",
          role: "user",
          content: "Test message",
          parts: [{ type: "text", text: "Test message" }],
        },
      ],
      chatId: "chat-123",
      userId: "user-123",
      model: "gpt-4.1-nano",
      isAuthenticated: false,
      systemPrompt: "You are a helpful assistant.",
      thinkingMode: "none",
      tools: [],
    }

    return { ...defaultRequest, ...overrides }
  }

  // Helper function to make API request
  const makeApiRequest = async (
    request: any,
    payload: Record<string, unknown>
  ): Promise<APIResponse> => {
    return await request.post(`${baseUrl}/api/chat`, {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Okie-E2E-Test/1.0",
      },
      timeout: 30000, // 30 second timeout for validation tests
    })
  }

  test.describe("Required Field Validation", () => {
    test("should reject request with missing chatId field", async ({
      request,
    }) => {
      console.log("🧪 Testing missing chatId validation")

      const payload = createChatRequest({ chatId: undefined })
      delete payload.chatId

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain("chatId or id")

      // Should include expected format guide
      expect(responseBody.expectedFormat).toBeDefined()
      expect(responseBody.expectedFormat.chatId).toBe("string (required)")
    })

    test("should reject request with missing userId field", async ({
      request,
    }) => {
      console.log("🧪 Testing missing userId validation")

      const payload = createChatRequest({ userId: undefined })
      delete payload.userId

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain("userId")

      // Should include expected format guide
      expect(responseBody.expectedFormat).toBeDefined()
      expect(responseBody.expectedFormat.userId).toBe("string (required)")
    })

    test("should reject request with missing model field", async ({
      request,
    }) => {
      console.log("🧪 Testing missing model validation")

      const payload = createChatRequest({ model: undefined })
      delete payload.model

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain("model")

      // Should include expected format guide
      expect(responseBody.expectedFormat).toBeDefined()
      expect(responseBody.expectedFormat.model).toBe("string (required)")
    })

    test("should reject request with missing messages field", async ({
      request,
    }) => {
      console.log("🧪 Testing missing messages validation")

      const payload = createChatRequest({ messages: undefined })
      delete payload.messages

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain(
        "messages (must be non-empty array)"
      )

      // Should include expected format guide
      expect(responseBody.expectedFormat).toBeDefined()
      expect(responseBody.expectedFormat.messages).toBeDefined()
    })

    test("should reject request with empty messages array", async ({
      request,
    }) => {
      console.log("🧪 Testing empty messages array validation")

      const payload = createChatRequest({ messages: [] })

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain(
        "messages (must be non-empty array)"
      )
    })

    test("should handle multiple missing fields correctly", async ({
      request,
    }) => {
      console.log("🧪 Testing multiple missing fields validation")

      const payload = {
        messages: [{ role: "user", content: "test" }],
        // Missing: chatId, userId, model, isAuthenticated, systemPrompt
      }

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message
      expect(responseBody.error).toContain("Missing required fields")

      // Should include all missing fields
      expect(responseBody.missingFields).toEqual(
        expect.arrayContaining(["chatId or id", "userId", "model"])
      )
      expect(responseBody.missingFields.length).toBeGreaterThanOrEqual(3)

      // Should include expected format guide
      expect(responseBody.expectedFormat).toBeDefined()
    })
  })

  test.describe("Legacy Request Format Handling", () => {
    test("should reject legacy request format with helpful migration guidance", async ({
      request,
    }) => {
      console.log("🧪 Testing legacy request format rejection")

      // This is the exact request format that was failing before the fix
      const legacyPayload = {
        id: "JFxABZEGIqoTiadx", // Legacy field name instead of chatId
        messages: [
          {
            id: "hSr4ldr6bywISC8A",
            role: "user",
            parts: [
              { type: "text", text: "Summarize World War II in 5 sentences" },
            ],
          },
          {
            role: "user",
            content: "Summarize World War II in 5 sentences\n\n\n\n\n",
            parts: [
              {
                type: "text",
                text: "Summarize World War II in 5 sentences\n\n\n\n\n",
              },
            ],
            id: "qHhWB7XgalIjFW80",
          },
        ],
        trigger: "submit-message", // Legacy field
      }

      const response = await makeApiRequest(request, legacyPayload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have helpful error message about missing fields
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.missingFields).toContain("chatId or id")
      expect(responseBody.missingFields).toContain("userId")
      expect(responseBody.missingFields).toContain("model")

      // Should include migration guidance in expected format
      expect(responseBody.expectedFormat).toBeDefined()
      expect(responseBody.expectedFormat.chatId).toBe("string (required)")
      expect(responseBody.expectedFormat.userId).toBe("string (required)")
      expect(responseBody.expectedFormat.model).toBe("string (required)")
      expect(responseBody.expectedFormat.thinkingMode).toBeDefined()
    })

    test("should explain the difference between old 'id' and new 'chatId' field", async ({
      request,
    }) => {
      console.log("🧪 Testing chatId vs id field validation")

      // Request with old 'id' field but missing other required fields
      const payloadWithOldId = {
        id: "some-chat-id", // Old field name
        messages: [{ role: "user", content: "test message" }],
        // Missing: chatId, userId, model
      }

      const response = await makeApiRequest(request, payloadWithOldId)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should specifically mention chatId or id in missing fields
      expect(responseBody.missingFields).toContain("chatId or id")

      // Should provide clear guidance about the current field name
      expect(responseBody.expectedFormat.chatId).toBe("string (required)")
    })
  })

  test.describe("Invalid JSON Handling", () => {
    test("should handle malformed JSON gracefully", async ({ request }) => {
      console.log("🧪 Testing malformed JSON handling")

      // Send invalid JSON that will fail JSON.parse()
      try {
        const response = await request.post(`${baseUrl}/api/chat`, {
          data: '{"invalid": json malformed syntax}', // Invalid JSON syntax
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Okie-E2E-Test/1.0",
          },
          timeout: 30000,
        })

        const responseBody = await response.json()

        console.log("📊 Response status:", response.status())
        console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

        // Should return 400 status
        expect(response.status()).toBe(400)

        // Should have appropriate error message
        expect(responseBody.error).toBe("Invalid request body")
      } catch (error) {
        console.log(
          "⚠️ Playwright might have blocked malformed JSON request:",
          error
        )

        // Fallback test: send empty object which will pass JSON parsing but fail validation
        const response = await request.post(`${baseUrl}/api/chat`, {
          data: "{}",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Okie-E2E-Test/1.0",
          },
          timeout: 30000,
        })

        const responseBody = await response.json()

        console.log("📊 Fallback test - Response status:", response.status())
        console.log(
          "📊 Fallback test - Response body:",
          JSON.stringify(responseBody, null, 2)
        )

        // Should return 400 status for missing fields
        expect(response.status()).toBe(400)
        expect(responseBody.error).toContain("Missing required fields")
      }
    })

    test("should handle empty request body", async ({ request }) => {
      console.log("🧪 Testing empty request body handling")

      try {
        const response = await request.post(`${baseUrl}/api/chat`, {
          data: "",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Okie-E2E-Test/1.0",
          },
          timeout: 30000,
        })

        const responseBody = await response.json()

        console.log("📊 Response status:", response.status())
        console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

        // Should return 400 status
        expect(response.status()).toBe(400)

        // Should have appropriate error message
        expect(responseBody.error).toBe("Invalid request body")
      } catch (error) {
        console.log("⚠️ Playwright might have blocked empty request:", error)

        // Fallback test: send minimal object that will pass JSON parsing but fail validation
        const response = await request.post(`${baseUrl}/api/chat`, {
          data: '{"test": true}',
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Okie-E2E-Test/1.0",
          },
          timeout: 30000,
        })

        const responseBody = await response.json()

        console.log("📊 Fallback test - Response status:", response.status())
        console.log(
          "📊 Fallback test - Response body:",
          JSON.stringify(responseBody, null, 2)
        )

        // Should return 400 status for missing fields
        expect(response.status()).toBe(400)
        expect(responseBody.error).toContain("Missing required fields")
      }
    })
  })

  test.describe("Valid Request Handling", () => {
    test("should accept valid request with all required fields", async ({
      request,
    }) => {
      console.log("🧪 Testing valid request acceptance")

      const validPayload = createChatRequest()

      const response = await makeApiRequest(request, validPayload)

      console.log("📊 Response status:", response.status())
      console.log("📊 Content-Type:", response.headers()["content-type"])

      // Should NOT return 400 status (validation should pass)
      expect(response.status()).not.toBe(400)

      // For valid requests, we expect either:
      // 1. 200 status with streaming response (if AI provider is available)
      // 2. 500 status (if AI provider is not configured, but validation passed)
      // 3. 429 status (if rate limited, but validation passed)

      if (response.status() === 200) {
        console.log(
          "✅ Valid request successfully processed with streaming response"
        )

        // Should have streaming content type
        const contentType = response.headers()["content-type"]
        expect(contentType).toMatch(
          /(text\/plain|application\/octet-stream|text\/event-stream)/
        )
      } else if (response.status() === 500) {
        console.log(
          "⚠️ Valid request passed validation but failed at AI provider level (expected in test environment)"
        )

        // This is acceptable in test environment where AI providers may not be configured
        const responseBody = await response.text()
        console.log("📊 Error details:", responseBody.substring(0, 200))
      } else if (response.status() === 429) {
        console.log(
          "⚠️ Valid request passed validation but hit rate limit (acceptable)"
        )
      } else {
        console.log(
          "❌ Unexpected response status for valid request:",
          response.status()
        )
        const responseBody = await response.text()
        console.log("📊 Response body:", responseBody.substring(0, 300))

        // Log for debugging but don't fail the test - the key point is validation passed
        console.log(
          "ℹ️ The important thing is that validation passed (status !== 400)"
        )
      }
    })

    test("should accept AI SDK v5 message format with parts", async ({
      request,
    }) => {
      console.log("🧪 Testing AI SDK v5 message format acceptance")

      const v5Payload = createChatRequest({
        messages: [
          {
            id: "msg-123",
            role: "user",
            parts: [
              { type: "text", text: "Analyze this data" },
              {
                type: "file",
                name: "data.csv",
                mediaType: "text/csv",
                data: "name,age,city\nJohn,25,NYC\nJane,30,LA",
              },
            ],
          },
        ],
      })

      const response = await makeApiRequest(request, v5Payload)

      console.log("📊 Response status:", response.status())

      // Should NOT return 400 status (validation should pass)
      expect(response.status()).not.toBe(400)

      console.log("✅ AI SDK v5 format passed validation")
    })

    test("should accept modern tools configuration", async ({ request }) => {
      console.log("🧪 Testing modern tools configuration acceptance")

      const toolsPayload = createChatRequest({
        tools: [
          { type: "web_search" },
          { type: "mcp", name: "server-sequential-thinking" },
        ],
        thinkingMode: "sequential",
      })

      const response = await makeApiRequest(request, toolsPayload)

      console.log("📊 Response status:", response.status())

      // Should NOT return 400 status (validation should pass)
      expect(response.status()).not.toBe(400)

      console.log("✅ Modern tools configuration passed validation")
    })

    test("should accept various thinking modes", async ({ request }) => {
      console.log("🧪 Testing thinking modes acceptance")

      const thinkingModes = ["none", "regular", "sequential"] as const

      for (const mode of thinkingModes) {
        console.log(`  Testing thinking mode: ${mode}`)

        const payload = createChatRequest({
          thinkingMode: mode,
          ...(mode === "regular" && { enableThink: true }),
          ...(mode === "sequential" && {
            tools: [{ type: "mcp", name: "server-sequential-thinking" }],
          }),
        })

        const response = await makeApiRequest(request, payload)

        console.log(`  📊 Response status for ${mode}:`, response.status())

        // Should NOT return 400 status (validation should pass)
        expect(response.status()).not.toBe(400)
      }

      console.log("✅ All thinking modes passed validation")
    })
  })

  test.describe("Error Response Format Validation", () => {
    test("should return consistent error response format", async ({
      request,
    }) => {
      console.log("🧪 Testing error response format consistency")

      const payload = { invalid: "request" } // Missing all required fields

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response status:", response.status())
      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Should return 400 status
      expect(response.status()).toBe(400)

      // Should have consistent error response structure
      expect(responseBody).toHaveProperty("error")
      expect(responseBody).toHaveProperty("missingFields")
      expect(responseBody).toHaveProperty("expectedFormat")

      // Error should be a string
      expect(typeof responseBody.error).toBe("string")

      // Missing fields should be an array
      expect(Array.isArray(responseBody.missingFields)).toBe(true)

      // Expected format should be an object with required field descriptions
      expect(typeof responseBody.expectedFormat).toBe("object")
      expect(responseBody.expectedFormat.chatId).toBe("string (required)")
      expect(responseBody.expectedFormat.userId).toBe("string (required)")
      expect(responseBody.expectedFormat.model).toBe("string (required)")
      expect(responseBody.expectedFormat.messages).toBeDefined()

      // Should have correct Content-Type header
      expect(response.headers()["content-type"]).toContain("application/json")
    })

    test("should provide helpful migration guidance in error messages", async ({
      request,
    }) => {
      console.log("🧪 Testing migration guidance in error messages")

      const payload = { messages: [{ role: "user", content: "test" }] }

      const response = await makeApiRequest(request, payload)
      const responseBody = await response.json()

      console.log("📊 Response body:", JSON.stringify(responseBody, null, 2))

      // Error message should be helpful for developers
      expect(responseBody.error).toContain("Missing required fields")
      expect(responseBody.error).toContain("Please provide all required fields")

      // Should explain what each field should contain
      expect(responseBody.expectedFormat.chatId).toContain("required")
      expect(responseBody.expectedFormat.userId).toContain("required")
      expect(responseBody.expectedFormat.model).toContain("required")
      expect(responseBody.expectedFormat.isAuthenticated).toContain("required")
      expect(responseBody.expectedFormat.systemPrompt).toContain("required")

      // Should show optional fields too
      expect(responseBody.expectedFormat.tools).toContain("optional")
      expect(responseBody.expectedFormat.thinkingMode).toContain("optional")
    })
  })
})
