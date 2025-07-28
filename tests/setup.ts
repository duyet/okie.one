import "@testing-library/jest-dom"
import { afterAll, afterEach, beforeAll, vi } from "vitest"

import { server } from "./mocks/server"

// Set up DOM globals
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
  readyState: "done" as const,
}

global.indexedDB = {
  open: vi.fn().mockReturnValue(mockIDBRequest),
  deleteDatabase: vi.fn().mockReturnValue(mockIDBRequest),
  databases: vi.fn().mockResolvedValue([]),
} as unknown as IDBFactory

// Ensure document.body exists for React Testing Library
beforeAll(() => {
  if (!document.body) {
    document.body = document.createElement("body")
  }

  // Mock window.scrollTo for JSDOM compatibility with motion library
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
  })
})

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

// Reset handlers after each test
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}))

// Mock Next.js image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string
    alt: string
    [key: string]: unknown
  }) => ({
    type: "img",
    props: { src, alt, ...props },
  }),
}))

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key")

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}
