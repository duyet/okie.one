import { Upload, FileText, Image } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No files yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Start uploading files to your chats. Images, PDFs, and text files will appear here for easy management.
          </p>
          
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-6">
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <Image className="h-6 w-6 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Images</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">PDFs</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Text</span>
            </div>
          </div>
          
          <Button asChild>
            <Link href="/">Start a new chat</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}