import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FileStats } from "@/app/files/file-stats"
import type { FileWithChat } from "@/app/files/api"

const mockFiles: FileWithChat[] = [
  {
    id: "1",
    chat_id: "chat-1",
    user_id: "user-1",
    file_name: "image1.png",
    file_type: "image/png",
    file_size: 1048576, // 1MB
    file_url: "https://example.com/image1.png",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    chat_id: "chat-2",
    user_id: "user-1",
    file_name: "document.pdf",
    file_type: "application/pdf",
    file_size: 2097152, // 2MB
    file_url: "https://example.com/document.pdf",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    chat_id: "chat-3",
    user_id: "user-1",
    file_name: "text.txt",
    file_type: "text/plain",
    file_size: 1024, // 1KB
    file_url: "https://example.com/text.txt",
    created_at: new Date().toISOString(),
  },
]

describe("FileStats", () => {
  it("should render all stat cards", () => {
    render(<FileStats files={mockFiles} />)
    
    // Check for card titles
    expect(screen.getByText("Total files")).toBeDefined()
    expect(screen.getByText("Storage used")).toBeDefined()
    expect(screen.getByText("Images")).toBeDefined()
    expect(screen.getByText("Documents")).toBeDefined()
    expect(screen.getByText("Text files")).toBeDefined()
  })

  it("should display correct total files count", () => {
    render(<FileStats files={mockFiles} />)
    
    expect(screen.getByText("3")).toBeDefined() // 3 files in mockFiles
  })

  it("should format total size correctly", () => {
    render(<FileStats files={mockFiles} />)
    
    // Total size: 1048576 + 2097152 + 1024 = 3146752 bytes = 3.0 MB
    expect(screen.getByText("3.0 MB")).toBeDefined()
  })

  it("should display file type counts", () => {
    render(<FileStats files={mockFiles} />)
    
    expect(screen.getByText("1")).toBeDefined() // 1 image
    expect(screen.getByText("1")).toBeDefined() // 1 document
    expect(screen.getByText("1")).toBeDefined() // 1 text file
  })

  it("should handle empty files array", () => {
    render(<FileStats files={[]} />)
    
    expect(screen.getAllByText("0")).toHaveLength(5) // Total files, images, documents, text files, and storage
    expect(screen.getByText("0 B")).toBeDefined() // Total size
  })

  it("should handle various size formats", () => {
    const testCases = [
      { size: 500, expected: "500 B" },
      { size: 1024, expected: "1.0 KB" },
      { size: 1048576, expected: "1.0 MB" },
      { size: 1073741824, expected: "1.0 GB" },
    ]
    
    testCases.forEach(({ size, expected }) => {
      const testFile: FileWithChat = {
        ...mockFiles[0],
        file_size: size,
      }
      const { rerender } = render(<FileStats files={[testFile]} />)
      
      expect(screen.getByText(expected)).toBeDefined()
      rerender(<></>)
    })
  })

  it("should show correct stat cards", () => {
    const { container } = render(<FileStats files={mockFiles} />)
    
    // Check for presence of 5 cards
    const cards = container.querySelectorAll('.grid > div')
    expect(cards).toHaveLength(5)
  })

  it("should handle files without type correctly", () => {
    const filesWithMissingTypes: FileWithChat[] = [
      {
        ...mockFiles[0],
        file_type: null as any,
      },
      {
        ...mockFiles[1],
        file_type: undefined as any,
      },
    ]
    
    render(<FileStats files={filesWithMissingTypes} />)
    
    // Should show 2 total files but 0 for each type
    expect(screen.getByText("2")).toBeDefined() // Total files
    expect(screen.getAllByText("0")).toHaveLength(3) // 0 images, 0 documents, 0 text files
  })

  it("should calculate stats correctly for various file types", () => {
    const diverseFiles: FileWithChat[] = [
      { ...mockFiles[0], file_type: "image/png" },
      { ...mockFiles[0], file_type: "image/jpeg" },
      { ...mockFiles[0], file_type: "application/pdf" },
      { ...mockFiles[0], file_type: "text/plain" },
      { ...mockFiles[0], file_type: "text/markdown" },
      { ...mockFiles[0], file_type: "application/json" }, // Not counted in any category
    ]
    
    render(<FileStats files={diverseFiles} />)
    
    expect(screen.getByText("6")).toBeDefined() // Total files
    expect(screen.getByText("2")).toBeDefined() // 2 images
    expect(screen.getByText("1")).toBeDefined() // 1 document (PDF)
    const textElements = screen.getAllByText("2")
    expect(textElements.length).toBeGreaterThan(0) // 2 text files
  })
})