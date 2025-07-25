import { useCallback, useState } from "react"

import { toast } from "@/components/ui/toast"
import {
  type Attachment,
  checkFileUploadLimit,
  processFiles,
  validateModelSupportsFiles,
  getModelFileCapabilities,
  validateFilesForModel,
} from "@/lib/file-handling"
import { MAX_FILES_PER_MESSAGE } from "@/lib/config"

export const useFileUpload = (modelId?: string) => {
  const [files, setFiles] = useState<File[]>([])

  const handleFileUploads = async (
    uid: string,
    chatId: string
  ): Promise<Attachment[] | null> => {
    if (files.length === 0) return []

    try {
      await checkFileUploadLimit(uid)
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      if (error.code === "DAILY_FILE_LIMIT_REACHED") {
        toast({
          title: error.message || "Daily file limit reached",
          status: "error",
        })
        return null
      }
      // Re-throw non-limit errors to be handled by outer catch
      throw err
    }

    try {
      const processed = await processFiles(files, chatId, uid)
      setFiles([])
      return processed
    } catch (error: unknown) {
      console.error("Failed to process files:", error)
      toast({ title: "Failed to process files", status: "error" })
      return null
    }
  }

  const createOptimisticAttachments = (files: File[]) => {
    return files.map((file) => ({
      name: file.name,
      contentType: file.type,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }))
  }

  const cleanupOptimisticAttachments = (
    attachments?: Array<{ url?: string }>
  ) => {
    if (!attachments) return
    attachments.forEach((attachment) => {
      if (attachment.url?.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.url)
      }
    })
  }

  const handleFileUpload = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => {
        // Check file count limit
        const combined = [...prev, ...newFiles]
        if (combined.length > MAX_FILES_PER_MESSAGE) {
          toast({
            title: `Maximum ${MAX_FILES_PER_MESSAGE} files allowed per message`,
            status: "warning",
          })
          // Only take up to the limit
          return combined.slice(0, MAX_FILES_PER_MESSAGE)
        }

        // If model is provided, validate files against model capabilities
        if (modelId) {
          const validation = validateFilesForModel(combined, modelId)
          if (!validation.isValid) {
            toast({
              title: validation.error || "File validation failed",
              status: "error",
            })
            return prev // Don't add invalid files
          }
        }

        return combined
      })
    },
    [modelId]
  )

  const handleFileRemove = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  const canAcceptFiles = modelId ? validateModelSupportsFiles(modelId) : true
  const fileCapabilities = modelId ? getModelFileCapabilities(modelId) : null
  const maxFiles = fileCapabilities?.maxFiles
    ? Math.min(fileCapabilities.maxFiles, MAX_FILES_PER_MESSAGE)
    : MAX_FILES_PER_MESSAGE

  return {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
    canAcceptFiles,
    fileCapabilities,
    maxFiles,
  }
}
