import { Download, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react"
import Image from "next/image"

import { formatDate } from "@/app/components/history/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { FileWithChat } from "./api"
import { FileStatusIndicator, type FileStatus } from "./file-status-indicator"
import { formatBytes, getFileIcon, getFileTypeCategory } from "./utils"

interface FileGridProps {
  files: FileWithChat[]
  onDelete: (fileId: string, fileName: string) => void
  onDownload: (fileUrl: string, fileName: string) => void
  fileStatuses?: Record<string, FileStatus>
}

export function FileGrid({ files, onDelete, onDownload, fileStatuses }: FileGridProps) {
  const isImage = (fileType: string | null) => {
    return fileType?.startsWith("image/") ?? false
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map((file) => {
        const FileIcon = getFileIcon(file.file_type)
        const category = getFileTypeCategory(file.file_type)

        return (
          <Card key={file.id} className="group overflow-hidden">
            <CardContent className="p-0">
              {/* File preview */}
              <div className="relative aspect-video overflow-hidden bg-muted">
                {isImage(file.file_type) ? (
                  <Image
                    src={file.file_url}
                    alt={file.file_name || "Uploaded file"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                {/* Overlay with actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onDownload(file.file_url, file.file_name || "file")
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {file.chat && (
                    <Button size="sm" variant="secondary" asChild>
                      <a href={`/c/${file.chat_id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* File info */}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3
                    className="flex-1 truncate font-medium text-sm"
                    title={file.file_name || undefined}
                  >
                    {file.file_name || "Untitled"}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          onDownload(file.file_url, file.file_name || "file")
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      {file.chat && (
                        <DropdownMenuItem asChild>
                          <a href={`/c/${file.chat_id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View chat
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          onDelete(file.id, file.file_name || "file")
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                  {file.file_size && (
                    <span className="text-muted-foreground text-xs">
                      {formatBytes(file.file_size)}
                    </span>
                  )}
                </div>

                {fileStatuses?.[file.id] && (
                  <div className="mb-2">
                    <FileStatusIndicator status={fileStatuses[file.id]} />
                  </div>
                )}

                {file.chat?.title && (
                  <p className="mb-1 truncate text-muted-foreground text-xs">
                    From: {file.chat.title}
                  </p>
                )}

                <p className="text-muted-foreground text-xs">
                  {formatDate(file.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
