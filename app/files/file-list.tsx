import { Download, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react"

import { formatDate } from "@/app/components/history/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { FileWithChat } from "./api"
import { formatBytes, getFileIcon, getFileTypeCategory } from "./utils"

interface FileListProps {
  files: FileWithChat[]
  onDelete: (fileId: string, fileName: string) => void
  onDownload: (fileUrl: string, fileName: string) => void
}

export function FileList({ files, onDelete, onDownload }: FileListProps) {
  const isImage = (fileType: string | null) => {
    return fileType?.startsWith("image/") ?? false
  }

  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_80px_80px_120px_100px_40px] gap-4 border-b bg-muted/50 p-4 font-medium text-muted-foreground text-sm">
        <div></div>
        <div>Name</div>
        <div>Type</div>
        <div>Size</div>
        <div>Chat</div>
        <div>Uploaded</div>
        <div></div>
      </div>

      {/* Files */}
      <div className="divide-y">
        {files.map((file) => {
          const FileIcon = getFileIcon(file.file_type)
          const category = getFileTypeCategory(file.file_type)

          return (
            <div
              key={file.id}
              className="grid grid-cols-[40px_1fr_80px_80px_120px_100px_40px] items-center gap-4 p-4 hover:bg-muted/50"
            >
              <div>
                {isImage(file.file_type) ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name || "Uploaded file"}
                    className="h-8 w-8 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <FileIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0">
                <div
                  className="truncate font-medium"
                  title={file.file_name || undefined}
                >
                  {file.file_name || "Untitled"}
                </div>
              </div>

              <div>
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
              </div>

              <div className="text-muted-foreground text-sm">
                {file.file_size ? formatBytes(file.file_size) : "—"}
              </div>

              <div className="min-w-0">
                {file.chat?.title ? (
                  <a
                    href={`/c/${file.chat_id}`}
                    className="block truncate text-primary text-sm hover:underline"
                    title={file.chat.title}
                  >
                    {file.chat.title}
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div className="text-muted-foreground text-sm">
                {formatDate(file.created_at)}
              </div>

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
