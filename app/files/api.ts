import type { Tables } from "@/app/types/database.types"

export type FileWithChat = Tables<"chat_attachments"> & {
  chat?: {
    id: string
    title: string | null
  } | null
}

export interface GetFilesOptions {
  sortBy?: "newest" | "oldest" | "name" | "size" | "type"
  filterBy?: "all" | "images" | "documents" | "text"
  limit?: number
  offset?: number
}

export async function getUserFiles(
  userId: string,
  options: GetFilesOptions = {}
): Promise<FileWithChat[]> {
  const {
    sortBy = "newest",
    filterBy = "all",
    limit = 100,
    offset = 0,
  } = options

  const params = new URLSearchParams({
    userId,
    sortBy,
    filterBy,
    limit: limit.toString(),
    offset: offset.toString(),
  })

  const response = await fetch(`/api/files?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to fetch files")
  }

  return response.json()
}

export async function deleteUserFile(fileId: string): Promise<void> {
  const response = await fetch(`/api/files/${fileId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to delete file")
  }
}

export async function downloadFile(
  fileUrl: string,
  fileName: string
): Promise<void> {
  try {
    // For Supabase URLs, we can directly download
    const response = await fetch(fileUrl)

    if (!response.ok) {
      throw new Error("Failed to fetch file")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    throw new Error("Failed to download file")
  }
}

export async function getFileStats(userId: string): Promise<{
  totalFiles: number
  totalSize: number
  filesByType: Record<string, number>
  recentActivity: {
    uploads: number
    downloads: number
  }
}> {
  const response = await fetch(`/api/files/stats?userId=${userId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to fetch file statistics")
  }

  return response.json()
}
