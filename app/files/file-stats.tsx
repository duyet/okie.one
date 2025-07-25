import { Card, CardContent } from "@/components/ui/card"

import type { FileWithChat } from "./api"
import { formatBytes } from "./utils"

interface FileStatsProps {
  files: FileWithChat[]
}

export function FileStats({ files }: FileStatsProps) {
  const stats = {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + (file.file_size || 0), 0),
    imageFiles: files.filter((f) => f.file_type?.startsWith("image/")).length,
    documentFiles: files.filter((f) => f.file_type === "application/pdf")
      .length,
    textFiles: files.filter((f) => f.file_type?.startsWith("text/")).length,
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <Card>
        <CardContent className="p-4">
          <div className="font-bold text-2xl">{stats.totalFiles}</div>
          <p className="text-muted-foreground text-xs">Total files</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="font-bold text-2xl">
            {formatBytes(stats.totalSize)}
          </div>
          <p className="text-muted-foreground text-xs">Storage used</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="font-bold text-2xl">{stats.imageFiles}</div>
          <p className="text-muted-foreground text-xs">Images</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="font-bold text-2xl">{stats.documentFiles}</div>
          <p className="text-muted-foreground text-xs">Documents</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="font-bold text-2xl">{stats.textFiles}</div>
          <p className="text-muted-foreground text-xs">Text files</p>
        </CardContent>
      </Card>
    </div>
  )
}
