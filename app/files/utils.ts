import { File, FileAudio, FileText, FileVideo, Image } from "lucide-react"

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export function getFileIcon(fileType: string | null) {
  if (!fileType) return File

  if (fileType.startsWith("image/")) return Image
  if (fileType.startsWith("audio/")) return FileAudio
  if (fileType.startsWith("video/")) return FileVideo
  if (fileType === "application/pdf" || fileType.startsWith("text/"))
    return FileText

  return File
}

export function getFileTypeCategory(fileType: string | null): string {
  if (!fileType) return "Unknown"

  if (fileType.startsWith("image/")) return "Image"
  if (fileType.startsWith("audio/")) return "Audio"
  if (fileType.startsWith("video/")) return "Video"
  if (fileType === "application/pdf") return "PDF"
  if (fileType.startsWith("text/")) return "Text"

  return "File"
}

export function isImageFile(fileType: string | null): boolean {
  return fileType?.startsWith("image/") ?? false
}

export function isPdfFile(fileType: string | null): boolean {
  return fileType === "application/pdf"
}

export function isTextFile(fileType: string | null): boolean {
  return fileType?.startsWith("text/") ?? false
}
