import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { FileGrid } from "@/app/files/file-grid"
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
    
    // Check for image preview placeholder
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)
  })

  it("should display file size correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("1.0 KB")).toBeDefined()
    expect(screen.getByText("2.0 KB")).toBeDefined()
  })

  it("should show actions on hover", async () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const firstFileCard = screen.getAllByRole("article")[0]
    fireEvent.mouseEnter(firstFileCard)
    
    await waitFor(() => {
      const downloadButton = screen.getAllByLabelText("Download")[0]
      expect(downloadButton).toBeDefined()
    })
  })

  it("should handle download action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // Click on the dropdown menu trigger
    const dropdownButtons = screen.getAllByRole("button", { name: "" })
    const moreButton = dropdownButtons.find(btn => btn.querySelector('[class*="MoreHorizontal"]'))
    if (moreButton) fireEvent.click(moreButton)
    
    // Click download in dropdown
    const downloadMenuItem = screen.getByText("Download")
    fireEvent.click(downloadMenuItem)
    
    expect(onDownload).toHaveBeenCalledWith("https://example.com/test-image.png", "test-image.png")
  })

  it("should handle delete action", async () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    // Click on the dropdown menu trigger
    const dropdownButtons = screen.getAllByRole("button", { name: "" })
    const moreButton = dropdownButtons.find(btn => btn.querySelector('[class*="MoreHorizontal"]'))
    if (moreButton) fireEvent.click(moreButton)
    
    // Click delete in dropdown
    const deleteMenuItem = screen.getByText("Delete")
    fireEvent.click(deleteMenuItem)
    
    expect(onDelete).toHaveBeenCalledWith("1", "test-image.png")
  })

  it("should display empty state when no files", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={[]} onDelete={onDelete} onDownload={onDownload} />)
    
    expect(screen.getByText("No files found")).toBeDefined()
  })

  it("should handle keyboard navigation", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileGrid files={mockFiles} onDelete={onDelete} onDownload={onDownload} />)
    
    const firstFileCard = screen.getAllByRole("article")[0]
    firstFileCard.focus()
    
    // Simulate Enter key to open file
    fireEvent.keyDown(firstFileCard, { key: "Enter", code: "Enter" })
    
    // The file card should be focusable
    expect(document.activeElement).toBe(firstFileCard)
  })
})