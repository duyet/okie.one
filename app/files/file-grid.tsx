import { formatDate } from "@/app/components/history/utils"
import { Download, MoreHorizontal, Trash2, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { FileWithChat } from "./api"
import { formatBytes, getFileIcon, getFileTypeCategory } from "./utils"

interface FileGridProps {
  files: FileWithChat[]
  onDelete: (fileId: string, fileName: string) => void
  onDownload: (fileUrl: string, fileName: string) => void
}

export function FileGrid({ files, onDelete, onDownload }: FileGridProps) {
  const isImage = (fileType: string | null) => {
    return fileType?.startsWith("image/") ?? false
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => {
        const FileIcon = getFileIcon(file.file_type)
        const category = getFileTypeCategory(file.file_type)
        
        return (
          <Card key={file.id} className="group overflow-hidden">
            <CardContent className="p-0">
              {/* File preview */}
              <div className="aspect-video bg-muted relative overflow-hidden">
                {isImage(file.file_type) ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name || "Uploaded file"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onDownload(file.file_url, file.file_name || "file")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {file.chat && (
                    <Button
                      size="sm"
                      variant="secondary"
                      asChild
                    >
                      <a href={`/c/${file.chat_id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              
              {/* File info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm truncate flex-1" title={file.file_name || undefined}>
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
                        onClick={() => onDownload(file.file_url, file.file_name || "file")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {file.chat && (
                        <DropdownMenuItem asChild>
                          <a href={`/c/${file.chat_id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View chat
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(file.id, file.file_name || "file")}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                  {file.file_size && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.file_size)}
                    </span>
                  )}
                </div>
                
                {file.chat?.title && (
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    From: {file.chat.title}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
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