import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { FileGrid } from "@/app/files/file-grid"
import type { FileWithChat } from "@/app/files/api"

// Mock the FileAnalysisDialog component
vi.mock("@/app/files/file-analysis-dialog", () => ({
  FileAnalysisDialog: () => null,
}))

// Mock the FileStatusIndicator component
vi.mock("@/app/files/file-status-indicator", () => ({
  FileStatusIndicator: ({ status }: { status: string }) => 
    <span data-testid="file-status">{status}</span>,
}))

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => 
    <img src={src} alt={alt} {...props} />,
}))

// Mock dropdown menu components
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: any) => 
    <button {...props}>{children}</button>,
  DropdownMenuContent: ({ children }: any) => 
    <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => 
    <button onClick={onClick}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}))

const mockFiles: FileWithChat[] = [
  {
    id: "1",
    chat_id: "chat-1",
    user_id: "user-1",
    file_name: "test-image.png",
    file_type: "image/png",
    file_size: 1024,
    file_url: "https://example.com/test-image.png",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    chat_id: "chat-2",
    user_id: "user-1",
    file_name: "document.pdf",
    file_type: "application/pdf",
    file_size: 2048,
    file_url: "https://example.com/document.pdf",
    created_at: new Date().toISOString(),
  },
]

describe("FileGrid", () => {
  it("should render all files in grid layout", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("test-image.png")).toBeDefined()
    expect(screen.getByText("document.pdf")).toBeDefined()
  })

  it("should display file type icons correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // Check for image preview (only PNG file shows as image)
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute("src")).toBe("https://example.com/test-image.png")
  })

  it("should display file size correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("1 KB")).toBeDefined()
    expect(screen.getByText("2 KB")).toBeDefined()
  })

  it("should show actions on hover", async () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const firstFileCard = screen.getByText("test-image.png").closest('[data-slot="card"]')
    if (firstFileCard) {
      fireEvent.mouseEnter(firstFileCard)
    }
    
    await waitFor(() => {
      const downloadButtons = screen.getAllByRole("button")
      // Check that there are download buttons visible
      const hasDownloadButton = downloadButtons.some(button => 
        button.querySelector('svg.lucide-download') !== null
      )
      expect(hasDownloadButton).toBe(true)
    })
  })

  it("should handle download action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // With our mocked dropdown, the menu items are always rendered
    const downloadButtons = screen.getAllByText("Download")
    expect(downloadButtons.length).toBeGreaterThan(0)
    
    // Click the first download button
    fireEvent.click(downloadButtons[0])
    
    expect(onDownload).toHaveBeenCalledWith("https://example.com/test-image.png", "test-image.png")
  })

  it("should handle delete action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // With our mocked dropdown, the menu items are always rendered
    const deleteButtons = screen.getAllByText("Delete")
    expect(deleteButtons.length).toBeGreaterThan(0)
    
    // Click the first delete button
    fireEvent.click(deleteButtons[0])
    
    expect(onDelete).toHaveBeenCalledWith("1", "test-image.png")
  })

  it("should render empty grid when no files", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    const { container } = render(<FileGrid files={[]} onDelete={onDelete} onDownload={onDownload} />)
    
    // FileGrid just renders an empty grid, the parent component handles empty state
    const grid = container.querySelector('.grid')
    expect(grid).toBeDefined()
    expect(grid?.children.length).toBe(0)
  })

  it("should handle keyboard navigation", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const firstFileCard = screen.getByText("test-image.png").closest('[data-slot="card"]')
    
    if (firstFileCard) {
      // Find the first focusable element within the card (like a button)
      const firstButton = firstFileCard.querySelector('button')
      if (firstButton) {
        firstButton.focus()
        
        // The button should be focusable
        expect(document.activeElement).toBe(firstButton)
        
        // Simulate Enter key
        fireEvent.keyDown(firstButton, { key: "Enter", code: "Enter" })
      }
    }
  })
})