import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { FileWithChat } from "@/app/files/api"
import { FileList } from "@/app/files/file-list"

// Mock the FileAnalysisDialog component
vi.mock("@/app/files/file-analysis-dialog", () => ({
  FileAnalysisDialog: () => null,
}))

// Mock the FileStatusIndicator component
vi.mock("@/app/files/file-status-indicator", () => ({
  FileStatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="file-status">{status}</span>
  ),
}))

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock dropdown menu components
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
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
    created_at: "2024-01-01T00:00:00Z",
    chat: {
      id: "chat-1",
      title: "Test Chat",
    },
  },
  {
    id: "2",
    chat_id: "chat-2",
    user_id: "user-1",
    file_name: "document.pdf",
    file_type: "application/pdf",
    file_size: 2097152, // 2MB
    file_url: "https://example.com/document.pdf",
    created_at: "2024-01-02T00:00:00Z",
    chat: {
      id: "chat-2",
      title: "Document Chat",
    },
  },
]

describe("FileList", () => {
  it("should render all files in list layout", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    expect(screen.getByText("test-image.png")).toBeDefined()
    expect(screen.getByText("document.pdf")).toBeDefined()
  })

  it("should display table headers", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("Type")).toBeDefined()
    expect(screen.getByText("Size")).toBeDefined()
    expect(screen.getByText("Status")).toBeDefined()
    expect(screen.getByText("Chat")).toBeDefined()
    expect(screen.getByText("Uploaded")).toBeDefined()
    // Actions column has no header text
  })

  it("should display file information correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    // File names
    expect(screen.getByText("test-image.png")).toBeDefined()
    expect(screen.getByText("document.pdf")).toBeDefined()

    // File types
    expect(screen.getByText("Image")).toBeDefined()
    expect(screen.getByText("PDF")).toBeDefined()

    // File sizes
    expect(screen.getByText("1 KB")).toBeDefined()
    expect(screen.getByText("2 MB")).toBeDefined()
  })

  it("should handle download action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    // With our mocked dropdown, the menu items are always rendered
    const downloadButtons = screen.getAllByText("Download")
    expect(downloadButtons.length).toBeGreaterThan(0)

    // Click the first download button
    fireEvent.click(downloadButtons[0])

    expect(onDownload).toHaveBeenCalledWith(
      "https://example.com/test-image.png",
      "test-image.png"
    )
  })

  it("should handle delete action", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    // With our mocked dropdown, the menu items are always rendered
    const deleteButtons = screen.getAllByText("Delete")
    expect(deleteButtons.length).toBeGreaterThan(0)

    // Click the first delete button
    fireEvent.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith("1", "test-image.png")
  })

  it("should render empty table when no files", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(<FileList files={[]} onDelete={onDelete} onDownload={onDownload} />)

    // FileList renders table headers even when empty
    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("Type")).toBeDefined()
    expect(screen.getByText("Size")).toBeDefined()

    // But no data rows - check the parent container has only header
    const container = document.querySelector(".divide-y")
    expect(container?.children.length).toBe(0) // No children in data section
  })

  it("should format dates correctly", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    // Dates should be formatted (exact format depends on locale)
    expect(screen.getByText("January 1, 2024")).toBeDefined()
    expect(screen.getByText("January 2, 2024")).toBeDefined()
  })

  it("should have chat links when chat exists", () => {
    const onDelete = vi.fn()
    const onDownload = vi.fn()
    render(
      <FileList files={mockFiles} onDelete={onDelete} onDownload={onDownload} />
    )

    // Check for chat links (from mockFiles[0] which has chat)
    const chatLinks = screen.getAllByRole("link")
    expect(chatLinks.length).toBeGreaterThan(0)

    // First file has a chat
    const testFileChat = screen.getByText("Test Chat")
    expect(testFileChat).toBeDefined()
    expect(testFileChat.getAttribute("href")).toBe("/c/chat-1")
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

    render(
      <FileList
        files={filesWithVariousTypes}
        onDelete={onDelete}
        onDownload={onDownload}
      />
    )

    expect(screen.getByText("Image")).toBeDefined()
    expect(screen.getByText("PDF")).toBeDefined()
    expect(screen.getByText("Video")).toBeDefined() // video type should show as "Video"
  })
})
