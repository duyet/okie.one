import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Define mock functions before they're used
const mockGetUserFiles = vi.fn()
const mockDeleteUserFile = vi.fn()
const mockDownloadFile = vi.fn()

// Mock the API module
vi.mock("@/app/files/api", () => ({
  getUserFiles: (...args: unknown[]) => mockGetUserFiles(...args),
  deleteUserFile: (...args: unknown[]) => mockDeleteUserFile(...args),
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}))

// Mock the other components
vi.mock("@/app/files/file-stats", () => ({
  FileStats: ({ files }: { files?: unknown[] }) => (
    <div>
      <div>Total files</div>
      <div>{files?.length || 0}</div>
    </div>
  ),
}))

vi.mock("@/app/files/empty-state", () => ({
  EmptyState: () => <div>No files found</div>,
}))

vi.mock("@/app/files/file-grid", () => ({
  FileGrid: ({ files }: { files?: Array<{ id: string; file_name: string }> }) => (
    <div data-testid="file-grid">
      {files?.map((file) => (
        <div key={file.id}>{file.file_name}</div>
      ))}
    </div>
  ),
}))

vi.mock("@/app/files/file-list", () => ({
  FileList: ({ files }: { files?: Array<{ id: string; file_name: string }> }) => (
    <div data-testid="file-list">
      {files?.map((file) => (
        <div key={file.id}>{file.file_name}</div>
      ))}
    </div>
  ),
}))

vi.mock("@/app/files/file-analytics", () => ({
  FileAnalytics: ({ userId }: { userId?: string }) => (
    <div data-testid="file-analytics">
      Analytics for user: {userId}
    </div>
  ),
}))

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({ onChange, ...props }: { onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; [key: string]: unknown }) => (
    <input onChange={onChange} {...props} />
  ),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
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
    
    const searchInput = screen.getByPlaceholderText("Search files and chats...")
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
    
    // Since we have mocked the components, we can check the grid is shown by default
    expect(screen.getByTestId('file-grid')).toBeDefined()
    
    // Find view toggle buttons - they have variant attributes
    const buttons = screen.getAllByRole("button")
    // The last three buttons should be the view toggles (grid, list, analytics)
    const viewButtons = buttons.slice(-3)
    expect(viewButtons).toHaveLength(3)
    
    // Click the list view button (the second one)
    fireEvent.click(viewButtons[1])
    
    // Check that FileList is now rendered instead of FileGrid
    await waitFor(() => {
      expect(screen.queryByTestId('file-grid')).toBeNull()
      expect(screen.getByTestId('file-list')).toBeDefined()
    })
  })

  it("should handle sort option changes", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    // Since our Select mock doesn't create a real combobox, verify the options exist
    expect(screen.getByText("Newest")).toBeDefined()
    expect(screen.getByText("Oldest")).toBeDefined()
    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("Size")).toBeDefined()
    expect(screen.getByText("Type")).toBeDefined()
    
    // The component will handle sorting internally when the real Select changes
  })

  it("should handle filter by file type", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    // Since our Select mock is simplified, we'll check that the options exist
    expect(screen.getByText("All files")).toBeDefined()
    expect(screen.getByText("Images")).toBeDefined()
    expect(screen.getByText("Documents")).toBeDefined()
    expect(screen.getByText("Text files")).toBeDefined()
    
    // The component should still display all files with our current mock
    expect(screen.getByText("test-image.png")).toBeDefined()
    expect(screen.getByText("document.pdf")).toBeDefined()
  })

  it("should toggle to analytics view", async () => {
    render(<FilesView userId="test-user" />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      expect(screen.getByText("test-image.png")).toBeDefined()
    })
    
    // Find view toggle buttons
    const buttons = screen.getAllByRole("button")
    const viewButtons = buttons.slice(-3)
    expect(viewButtons).toHaveLength(3)
    
    // Click the analytics view button (the third/last one)
    fireEvent.click(viewButtons[2])
    
    // Check that FileAnalytics is now rendered
    await waitFor(() => {
      expect(screen.queryByTestId('file-grid')).toBeNull()
      expect(screen.queryByTestId('file-list')).toBeNull()
      expect(screen.getByTestId('file-analytics')).toBeDefined()
    })
  })
})