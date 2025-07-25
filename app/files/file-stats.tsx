import { FileWithChat } from "./api"
import { Card, CardContent } from "@/components/ui/card"
import { formatBytes } from "./utils"

interface FileStatsProps {
  files: FileWithChat[]
}

export function FileStats({ files }: FileStatsProps) {
  const stats = {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + (file.file_size || 0), 0),
    imageFiles: files.filter(f => f.file_type?.startsWith("image/")).length,
    documentFiles: files.filter(f => f.file_type === "application/pdf").length,
    textFiles: files.filter(f => f.file_type?.startsWith("text/")).length,
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.totalFiles}</div>
          <p className="text-xs text-muted-foreground">Total files</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{formatBytes(stats.totalSize)}</div>
          <p className="text-xs text-muted-foreground">Storage used</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.imageFiles}</div>
          <p className="text-xs text-muted-foreground">Images</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.documentFiles}</div>
          <p className="text-xs text-muted-foreground">Documents</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.textFiles}</div>
          <p className="text-xs text-muted-foreground">Text files</p>
        </CardContent>
      </Card>
    </div>
  )
}