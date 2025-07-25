import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { FileList } from "@/app/files/file-list"
import type { FileWithChat } from "@/app/files/api"

const mockFiles: FileWithChat[] = [
  {
    id: "1",
    chat_id: "chat-1",
    user_id: "user-1",
    file_name: "test-image.png",
    file_type: "image/png",
    file_size: 1024,
    file_url: "https://example.com/test-image.png",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    chat_id: "chat-2",
    user_id: "user-1",
    file_name: "document.pdf",
    file_type: "application/pdf",
    file_size: 2048576, // 2MB
    file_url: "https://example.com/document.pdf",
    created_at: "2024-01-02T00:00:00Z",
  },
]

describe("FileList", () => {
  it("should render all files in list layout", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("test-image.png")).toBeDefined()
    expect(screen.getByText("document.pdf")).toBeDefined()
  })

  it("should display table headers", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("Type")).toBeDefined()
    expect(screen.getByText("Size")).toBeDefined()
    expect(screen.getByText("Uploaded")).toBeDefined()
    expect(screen.getByText("Actions")).toBeDefined()
  })

  it("should display file information correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // File names
    expect(screen.getByText("test-image.png")).toBeDefined()
    expect(screen.getByText("document.pdf")).toBeDefined()
    
    // File types
    expect(screen.getByText("Image")).toBeDefined()
    expect(screen.getByText("Document")).toBeDefined()
    
    // File sizes
    expect(screen.getByText("1.0 KB")).toBeDefined()
    expect(screen.getByText("2.0 MB")).toBeDefined()
  })

  it("should handle download action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const downloadButtons = screen.getAllByLabelText("Download")
    expect(downloadButtons).toHaveLength(2)
    
    fireEvent.click(downloadButtons[0])
    expect(onDownload).toHaveBeenCalledWith("https://example.com/test-image.png", "test-image.png")
  })

  it("should handle delete action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const deleteButtons = screen.getAllByLabelText("Delete")
    expect(deleteButtons).toHaveLength(2)
    
    fireEvent.click(deleteButtons[0])
    expect(onDelete).toHaveBeenCalledWith("1", "test-image.png")
    
    fireEvent.click(deleteButtons[1])
    expect(onDelete).toHaveBeenCalledWith("2", "document.pdf")
  })

  it("should display empty state when no files", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={[]} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("No files found")).toBeDefined()
  })

  it("should format dates correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // Dates should be formatted (exact format depends on locale)
    expect(screen.getByText(/Jan 1, 2024|1\/1\/2024/)).toBeDefined()
    expect(screen.getByText(/Jan 2, 2024|1\/2\/2024/)).toBeDefined()
  })

  it("should have clickable file names", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const fileLinks = screen.getAllByRole("link")
    expect(fileLinks).toHaveLength(2)
    
    expect(fileLinks[0]).toHaveAttribute("href", mockFiles[0].file_url)
    expect(fileLinks[1]).toHaveAttribute("href", mockFiles[1].file_url)
  })

  it("should show correct file type badges", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    const filesWithVariousTypes: FileWithChat[] = [
      ...mockFiles,
      {
        id: "3",
        chat_id: "chat-3",
        user_id: "user-1",
        file_name: "video.mp4",
        file_type: "video/mp4",
        file_size: 10485760, // 10MB
        file_url: "https://example.com/video.mp4",
        created_at: "2024-01-03T00:00:00Z",
          },
    ]
    
    render(<FileList files={filesWithVariousTypes} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("Image")).toBeDefined()
    expect(screen.getByText("Document")).toBeDefined()
    expect(screen.getByText("Other")).toBeDefined() // video type should show as "Other"
  })
})