import type { SupabaseClient } from "@supabase/supabase-js"
import * as fileType from "file-type"

import { toast } from "@/components/ui/toast"

import {
  DAILY_FILE_UPLOAD_LIMIT,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  MAX_FILES_PER_MESSAGE,
} from "./config"
import { createClient } from "./supabase/client"
import { isSupabaseEnabled } from "./supabase/config"
import { getModelInfo } from "./models"

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  const buffer = await file.arrayBuffer()
  const type = await fileType.fileTypeFromBuffer(
    Buffer.from(buffer.slice(0, 4100))
  )

  if (!type || !ALLOWED_FILE_TYPES.includes(type.mime)) {
    return {
      isValid: false,
      error: "File type not supported or doesn't match its extension",
    }
  }

  return { isValid: true }
}

export async function uploadFile(
  supabase: SupabaseClient,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `uploads/${fileName}`

  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(filePath, file)

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("chat-attachments").getPublicUrl(filePath)

  return publicUrl
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: file.name,
    contentType: file.type,
    url,
  }
}

export async function processFiles(
  files: File[],
  chatId: string,
  userId: string
): Promise<Attachment[]> {
  const supabase = isSupabaseEnabled ? createClient() : null
  const attachments: Attachment[] = []

  for (const file of files) {
    const validation = await validateFile(file)
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error)
      toast({
        title: "File validation failed",
        description: validation.error,
        status: "error",
      })
      continue
    }

    try {
      const url = supabase
        ? await uploadFile(supabase, file)
        : URL.createObjectURL(file)

      if (supabase) {
        const { error } = await supabase.from("chat_attachments").insert({
          chat_id: chatId,
          user_id: userId,
          file_url: url,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })

        if (error) {
          throw new Error(`Database insertion failed: ${error.message}`)
        }
      }

      attachments.push(createAttachment(file, url))
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
    }
  }

  return attachments
}

export class FileUploadLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_FILE_LIMIT_REACHED"
  }
}

export async function checkFileUploadLimit(userId: string) {
  if (!isSupabaseEnabled) return 0

  const supabase = createClient()

  if (!supabase) {
    toast({
      title: "File upload is not supported in this deployment",
      status: "info",
    })
    return 0
  }

  const now = new Date()
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )

  const { count, error } = await supabase
    .from("chat_attachments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfToday.toISOString())

  if (error) throw new Error(error.message)
  if (count && count >= DAILY_FILE_UPLOAD_LIMIT) {
    throw new FileUploadLimitError("Daily file upload limit reached.")
  }

  return count
}

// Model capability validation helpers
export function validateModelSupportsFiles(modelId: string): boolean {
  const modelConfig = getModelInfo(modelId)
  return (
    modelConfig?.vision === true ||
    (modelConfig?.fileCapabilities?.maxFiles ?? 0) > 0
  )
}

export function getModelFileCapabilities(modelId: string) {
  const modelConfig = getModelInfo(modelId)

  if (!modelConfig) {
    return null
  }

  // Use fileCapabilities if available, otherwise fall back to legacy vision field
  if (modelConfig.fileCapabilities) {
    return modelConfig.fileCapabilities
  }

  // Legacy support for models with vision but no fileCapabilities
  if (modelConfig.vision) {
    return {
      maxFiles: 10, // Default for vision models
      maxFileSize: MAX_FILE_SIZE,
      supportedTypes: ["image/*", "text/*"],
      features: ["image_analysis"],
    }
  }

  return null
}

export function validateFilesForModel(
  files: File[],
  modelId: string
): {
  isValid: boolean
  error?: string
} {
  const capabilities = getModelFileCapabilities(modelId)

  if (!capabilities) {
    return {
      isValid: false,
      error: "This model does not support file attachments",
    }
  }

  // Check file count
  if (files.length > Math.min(capabilities.maxFiles, MAX_FILES_PER_MESSAGE)) {
    return {
      isValid: false,
      error: `Maximum ${MAX_FILES_PER_MESSAGE} files allowed per message`,
    }
  }

  // Check file types and sizes
  for (const file of files) {
    // Check file size
    if (file.size > capabilities.maxFileSize) {
      return {
        isValid: false,
        error: `File "${file.name}" exceeds the ${capabilities.maxFileSize / (1024 * 1024)}MB size limit`,
      }
    }

    // Check file type
    const isTypeSupported = capabilities.supportedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const category = type.replace("/*", "")
        return file.type.startsWith(category + "/")
      }
      return file.type === type
    })

    if (!isTypeSupported) {
      return {
        isValid: false,
        error: `File type "${file.type}" is not supported by this model`,
      }
    }
  }

  return { isValid: true }
}
