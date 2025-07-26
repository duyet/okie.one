import { describe, expect, it, vi } from "vitest"

// Mock dependencies
vi.mock("file-type", () => ({
  fileTypeFromBuffer: vi.fn(),
}))

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}))

vi.mock("@/lib/config", () => ({
  DAILY_FILE_UPLOAD_LIMIT: 10,
  MAX_FILES_PER_MESSAGE: 3,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/heic",
    "image/heif",
    "application/pdf",
    "text/plain",
    "text/markdown",
  ],
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/config")>()
  return {
    ...actual,
    isSupabaseEnabled: true,
    isSupabaseEnabledClient: true,
  }
})

vi.mock("@/lib/models", () => ({
  getModelInfo: vi.fn((modelId: string) => {
    if (modelId === "gpt-4.1") {
      return {
        id: "gpt-4.1",
        vision: true,
        fileCapabilities: {
          maxFiles: 10,
          maxFileSize: 20 * 1024 * 1024,
          supportedTypes: ["image/*", "text/*"],
          features: ["image_analysis"],
        },
      }
    }
    if (modelId === "gpt-3.5-turbo") {
      return {
        id: "gpt-3.5-turbo",
        vision: false,
      }
    }
    return null
  }),
}))

describe("File Handling Library", () => {
  // Test setup is handled inline per test

  describe("validateFile()", () => {
    it("should validate file size correctly", async () => {
      const { validateFile } = await import("@/lib/file-handling")

      // Create a file that exceeds 10MB limit
      const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.txt", {
        type: "text/plain",
      })

      const result = await validateFile(largeFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain("File size exceeds 10MB limit")
    })

    it("should validate allowed file types", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)

      mockFileTypeFromBuffer.mockResolvedValue({
        mime: "image/jpeg",
        ext: "jpg",
      })

      const { validateFile } = await import("@/lib/file-handling")

      // Mock File with arrayBuffer method
      const validFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      } as unknown as File

      const result = await validateFile(validFile)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it("should reject unsupported file types", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)

      mockFileTypeFromBuffer.mockResolvedValue({
        mime: "application/x-executable",
        ext: "exe",
      })

      const { validateFile } = await import("@/lib/file-handling")

      // Mock File with arrayBuffer method
      const invalidFile = {
        name: "virus.exe",
        type: "application/x-executable",
        size: 1024,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      } as unknown as File

      const result = await validateFile(invalidFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain(
        "File type not supported or doesn't match its extension"
      )
    })

    it("should handle files with no detectable type", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)

      mockFileTypeFromBuffer.mockResolvedValue(undefined)

      const { validateFile } = await import("@/lib/file-handling")

      // Mock File with arrayBuffer method
      const unknownFile = {
        name: "unknown.bin",
        type: "application/octet-stream",
        size: 1024,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      } as unknown as File

      const result = await validateFile(unknownFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain(
        "File type not supported or doesn't match its extension"
      )
    })

    it("should accept various supported file types", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)

      const supportedTypes = [
        { mime: "image/png", ext: "png", filename: "image.png" },
        { mime: "application/pdf", ext: "pdf", filename: "document.pdf" },
        { mime: "text/plain", ext: "txt", filename: "text.txt" },
        { mime: "text/markdown", ext: "md", filename: "document.md" },
      ]

      const { validateFile } = await import("@/lib/file-handling")

      for (const type of supportedTypes) {
        mockFileTypeFromBuffer.mockResolvedValue({
          mime: type.mime,
          ext: type.ext,
        })

        // Mock File with arrayBuffer method
        const file = {
          name: type.filename,
          type: type.mime,
          size: 1024,
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        } as unknown as File

        const result = await validateFile(file)

        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      }
    })
  })

  describe("uploadFile()", () => {
    it("should upload file successfully", async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn().mockReturnValue({
              data: {
                publicUrl:
                  "https://storage.supabase.co/object/public/chat-attachments/uploads/abc123.txt",
              },
            }),
          }),
        },
      }

      const { uploadFile } = await import("@/lib/file-handling")

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      })
      const url = await uploadFile(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >,
        file
      )

      expect(url).toBe(
        "https://storage.supabase.co/object/public/chat-attachments/uploads/abc123.txt"
      )
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("chat-attachments")
    })

    it("should handle upload errors", async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              error: { message: "Storage quota exceeded" },
            }),
          }),
        },
      }

      const { uploadFile } = await import("@/lib/file-handling")

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      })

      await expect(
        uploadFile(
          mockSupabase as unknown as NonNullable<
            ReturnType<typeof import("@/lib/supabase/client").createClient>
          >,
          file
        )
      ).rejects.toThrow("Error uploading file: Storage quota exceeded")
    })

    it("should generate unique file names", async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn().mockReturnValue({
              data: { publicUrl: "https://storage.supabase.co/test-url" },
            }),
          }),
        },
      }

      const { uploadFile } = await import("@/lib/file-handling")

      const file = new File(["test"], "original.txt", { type: "text/plain" })

      await uploadFile(
        mockSupabase as unknown as NonNullable<
          ReturnType<typeof import("@/lib/supabase/client").createClient>
        >,
        file
      )

      const uploadCall = mockSupabase.storage.from().upload
      expect(uploadCall).toHaveBeenCalled()

      const [filePath] = uploadCall.mock.calls[0]
      expect(filePath).toMatch(/^uploads\/\w+\.txt$/)
      expect(filePath).not.toBe("uploads/original.txt") // Should be randomized
    })
  })

  describe("createAttachment()", () => {
    it("should create attachment object correctly", async () => {
      const { createAttachment } = await import("@/lib/file-handling")

      const file = new File(["test content"], "document.pdf", {
        type: "application/pdf",
      })
      const url = "https://example.com/document.pdf"

      const attachment = createAttachment(file, url)

      expect(attachment).toEqual({
        name: "document.pdf",
        contentType: "application/pdf",
        url: "https://example.com/document.pdf",
      })
    })

    it("should handle files with special characters", async () => {
      const { createAttachment } = await import("@/lib/file-handling")

      const file = new File(
        ["content"],
        "file name with spaces & symbols.txt",
        {
          type: "text/plain",
        }
      )
      const url = "https://example.com/encoded-url"

      const attachment = createAttachment(file, url)

      expect(attachment.name).toBe("file name with spaces & symbols.txt")
      expect(attachment.contentType).toBe("text/plain")
      expect(attachment.url).toBe("https://example.com/encoded-url")
    })
  })

  describe("FileUploadLimitError", () => {
    it("should create error with correct properties", async () => {
      const { FileUploadLimitError } = await import("@/lib/file-handling")

      const error = new FileUploadLimitError("Upload limit reached")

      expect(error.message).toBe("Upload limit reached")
      expect(error.code).toBe("DAILY_FILE_LIMIT_REACHED")
      expect(error instanceof Error).toBe(true)
    })
  })

  describe("checkFileUploadLimit()", () => {
    it("should return 0 when Supabase is disabled", async () => {
      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: false,
        isSupabaseEnabledClient: false,
      }))

      const { checkFileUploadLimit } = await import("@/lib/file-handling")

      const result = await checkFileUploadLimit("user-123")

      expect(result).toBe(0)
    })

    it("should check file upload count correctly", async () => {
      const mockGte = vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({
        gte: mockGte,
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })
      const mockSupabase = {
        from: mockFrom,
      }

      vi.doMock("@/lib/supabase/client", () => ({
        createClient: vi.fn().mockReturnValue(mockSupabase),
      }))

      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: true,
        isSupabaseEnabledClient: true,
      }))

      vi.resetModules()
      const { checkFileUploadLimit } = await import("@/lib/file-handling")

      const result = await checkFileUploadLimit("user-123")

      expect(result).toBe(5)
      expect(mockFrom).toHaveBeenCalledWith("chat_attachments")
      expect(mockSelect).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      })
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123")
      expect(mockGte).toHaveBeenCalledWith("created_at", expect.any(String))
    })

    it("should throw FileUploadLimitError when limit exceeded", async () => {
      const mockGte = vi.fn().mockResolvedValue({
        count: 10, // Equal to DAILY_FILE_UPLOAD_LIMIT
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({
        gte: mockGte,
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })
      const mockSupabase = {
        from: mockFrom,
      }

      vi.doMock("@/lib/supabase/client", () => ({
        createClient: vi.fn().mockReturnValue(mockSupabase),
      }))

      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: true,
        isSupabaseEnabledClient: true,
      }))

      vi.resetModules()
      const { checkFileUploadLimit, FileUploadLimitError } = await import(
        "@/lib/file-handling"
      )

      await expect(checkFileUploadLimit("user-123")).rejects.toThrow(
        FileUploadLimitError
      )
      await expect(checkFileUploadLimit("user-123")).rejects.toThrow(
        "Daily file upload limit reached."
      )
    })

    it("should handle database errors", async () => {
      const mockGte = vi.fn().mockResolvedValue({
        count: null,
        error: { message: "Database connection failed" },
      })
      const mockEq = vi.fn().mockReturnValue({
        gte: mockGte,
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })
      const mockSupabase = {
        from: mockFrom,
      }

      vi.doMock("@/lib/supabase/client", () => ({
        createClient: vi.fn().mockReturnValue(mockSupabase),
      }))

      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: true,
        isSupabaseEnabledClient: true,
      }))

      vi.resetModules()
      const { checkFileUploadLimit } = await import("@/lib/file-handling")

      await expect(checkFileUploadLimit("user-123")).rejects.toThrow(
        "Database connection failed"
      )
    })

    it("should return 0 when createClient returns null", async () => {
      vi.doMock("@/lib/supabase/client", () => ({
        createClient: vi.fn().mockReturnValue(null),
      }))

      vi.resetModules()
      const toast = await import("@/components/ui/toast")
      const { checkFileUploadLimit } = await import("@/lib/file-handling")

      const result = await checkFileUploadLimit("user-123")

      expect(result).toBe(0)
      expect(toast.toast).toHaveBeenCalledWith({
        title: "File upload is not supported in this deployment",
        status: "info",
      })
    })
  })

  describe("processFiles()", () => {
    it("should process valid files successfully", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)
      mockFileTypeFromBuffer.mockResolvedValue({
        mime: "text/plain",
        ext: "txt",
      })

      // Mock storage operations
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: "https://storage.supabase.co/test.txt" },
      })
      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      // Mock database operations
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      const mockDbFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      const mockSupabase = {
        storage: {
          from: mockStorageFrom,
        },
        from: mockDbFrom,
      }

      vi.doMock("@/lib/supabase/client", () => ({
        createClient: vi.fn().mockReturnValue(mockSupabase),
      }))

      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: true,
        isSupabaseEnabledClient: true,
      }))

      vi.resetModules()
      const { processFiles } = await import("@/lib/file-handling")

      // Mock Files with arrayBuffer method
      const files = [
        {
          name: "file1.txt",
          type: "text/plain",
          size: 1024,
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        } as unknown as File,
        {
          name: "file2.txt",
          type: "text/plain",
          size: 1024,
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        } as unknown as File,
      ]

      const attachments = await processFiles(files, "chat-123", "user-456")

      expect(attachments).toHaveLength(2)
      expect(attachments[0]).toEqual({
        name: "file1.txt",
        contentType: "text/plain",
        url: "https://storage.supabase.co/test.txt",
      })
      expect(mockStorageFrom).toHaveBeenCalledWith("chat-attachments")
      expect(mockDbFrom).toHaveBeenCalledWith("chat_attachments")
    })

    it("should skip invalid files and continue processing", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)

      // First file invalid, second file valid
      mockFileTypeFromBuffer
        .mockResolvedValueOnce(undefined) // Invalid file type
        .mockResolvedValueOnce({ mime: "text/plain", ext: "txt" }) // Valid file type

      // Mock storage operations
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: "https://storage.supabase.co/valid.txt" },
      })
      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      // Mock database operations
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      const mockDbFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      const mockSupabase = {
        storage: {
          from: mockStorageFrom,
        },
        from: mockDbFrom,
      }

      vi.doMock("@/lib/supabase/client", () => ({
        createClient: vi.fn().mockReturnValue(mockSupabase),
      }))

      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: true,
        isSupabaseEnabledClient: true,
      }))

      vi.resetModules()
      const toast = await import("@/components/ui/toast")
      const { processFiles } = await import("@/lib/file-handling")

      // Mock Files with arrayBuffer method
      const files = [
        {
          name: "invalid.exe",
          type: "application/x-executable",
          size: 1024,
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        } as unknown as File,
        {
          name: "valid.txt",
          type: "text/plain",
          size: 1024,
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        } as unknown as File,
      ]

      const attachments = await processFiles(files, "chat-123", "user-456")

      expect(attachments).toHaveLength(1)
      expect(attachments[0].name).toBe("valid.txt")
      expect(toast.toast).toHaveBeenCalledWith({
        title: "File validation failed",
        description: "File type not supported or doesn't match its extension",
        status: "error",
      })
    })

    it("should handle processing without Supabase", async () => {
      const fileType = await import("file-type")
      const mockFileTypeFromBuffer = vi.mocked(fileType.fileTypeFromBuffer)
      mockFileTypeFromBuffer.mockResolvedValue({
        mime: "text/plain",
        ext: "txt",
      })

      vi.doMock("@/lib/supabase/config", () => ({
        isSupabaseEnabled: false,
        isSupabaseEnabledClient: false,
      }))

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url")

      vi.resetModules()
      const { processFiles } = await import("@/lib/file-handling")

      // Mock File with arrayBuffer method
      const files = [
        {
          name: "file.txt",
          type: "text/plain",
          size: 1024,
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        } as unknown as File,
      ]

      const attachments = await processFiles(files, "chat-123", "user-456")

      expect(attachments).toHaveLength(1)
      expect(attachments[0].url).toBe("blob:mock-url")
    })
  })
})
