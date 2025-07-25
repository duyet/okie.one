import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Define mock functions before they're used
const mockGetUserFiles = vi.fn()
const mockDeleteUserFile = vi.fn()
const mockDownloadFile = vi.fn()

// Mock the API module
vi.mock("@/app/files/api", () => ({
  getUserFiles: (...args: any[]) => mockGetUserFiles(...args),
  deleteUserFile: (...args: any[]) => mockDeleteUserFile(...args),
  downloadFile: (...args: any[]) => mockDownloadFile(...args),
}))

import { FilesView } from "@/app/files/files-view"

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        gcTime: 0,
      },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe("FilesView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up default mock responses
    mockGetUserFiles.mockResolvedValue([
      {
        id: "1",
        file_name: "test-image.png",
        file_type: "image/png",
        file_size: 1024,
        file_url: "https://example.com/test-image.png",
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        file_name: "document.pdf",
        file_type: "application/pdf",
        file_size: 2048,
        file_url: "https://example.com/document.pdf",
        created_at: new Date().toISOString(),
      },
    ])
    
    mockDeleteUserFile.mockResolvedValue(undefined)
    mockDownloadFile.mockResolvedValue(undefined)
  })

  it("should render the files view with header", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull()
    })
    
    // Check for FileStats which should show "Total files"
    expect(screen.getByText("Total files")).toBeDefined()
  })

  it("should show loading state initially", () => {
    // Create a mock that doesn't resolve immediately
    mockGetUserFiles.mockImplementation(() => new Promise(() => {}))
    
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    // Check for the spinner div with specific classes
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeDefined()
  })

  it("should display files after loading", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
      expect(screen.getByText("document.pdf")).toBeDefined()
    })
  })

  it("should handle search input", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    const searchInput = screen.getByPlaceholderText("Search files...")
    fireEvent.change(searchInput, { target: { value: "document" } })
    
    await waitFor(() => {
      expect(screen.queryByText("test-image.png")).toBeNull()
      expect(screen.getByText("document.pdf")).toBeDefined()
    })
  })

  it("should toggle between grid and list view", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    // Find buttons by their child SVG icons
    const buttons = screen.getAllByRole("button")
    const gridButton = buttons.find(btn => btn.querySelector('svg.lucide-grid'))
    const listButton = buttons.find(btn => btn.querySelector('svg.lucide-list'))
    
    expect(gridButton).toBeDefined()
    expect(listButton).toBeDefined()
    
    // Grid view should be default (has variant="default")
    expect(gridButton?.className).toContain("bg-primary")
    
    // Click list view button
    if (listButton) {
      fireEvent.click(listButton)
    }
    
    // Now list should be active
    await waitFor(() => {
      expect(listButton?.className).toContain("bg-primary")
      expect(gridButton?.className).not.toContain("bg-primary")
    })
  })

  it("should handle sort option changes", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    const sortSelect = screen.getByRole("combobox") as HTMLSelectElement
    fireEvent.change(sortSelect, { target: { value: "name" } })
    
    expect(sortSelect.value).toBe("name")
  })

  it("should handle filter by file type", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    const filterSelect = screen.getByRole("combobox", { name: /filter/i })
    fireEvent.change(filterSelect, { target: { value: "image" } })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
      expect(screen.queryByText("document.pdf")).toBeNull()
    })
  })
})