import { vi } from "vitest"

// Test helper utilities
export const createMockChat = (overrides = {}) => ({
  id: "test-chat-1",
  title: "Test Chat",
  userId: "test-user",
  projectId: "test-project",
  model: "gpt-4.1-nano",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

export const createMockMessage = (overrides = {}) => ({
  id: "test-message-1",
  chatId: "test-chat-1",
  role: "user" as const,
  content: "Test message content",
  createdAt: new Date().toISOString(),
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: "test-user-1",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date().toISOString(),
  ...overrides,
})

export const createMockProject = (overrides = {}) => ({
  id: "test-project-1",
  name: "Test Project",
  userId: "test-user-1",
  createdAt: new Date().toISOString(),
  ...overrides,
})

// Mock API responses
export const mockSuccessResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
})

export const mockErrorResponse = (
  status = 500,
  message = "Internal Server Error"
) => ({
  ok: false,
  status,
  json: vi.fn().mockResolvedValue({ error: message }),
  text: vi.fn().mockResolvedValue(JSON.stringify({ error: message })),
})

// Test environment helpers
export const withMockFetch = (mockResponse: Response | Promise<Response>) => {
  const originalFetch = global.fetch
  global.fetch = vi.fn().mockResolvedValue(mockResponse)

  return () => {
    global.fetch = originalFetch
  }
}
