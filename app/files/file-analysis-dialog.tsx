"use client"

import { useState } from "react"
import { Loader2, FileText, Sparkles, Copy, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"

import type { FileWithChat } from "./api"
import { formatBytes } from "./utils"

interface FileAnalysis {
  summary: string
  keyPoints: string[]
  fileType: string
  language?: string
  topics?: string[]
  complexity?: "simple" | "moderate" | "complex"
}

interface FileAnalysisDialogProps {
  file: FileWithChat | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAnalyze?: (file: FileWithChat) => Promise<FileAnalysis>
}

export function FileAnalysisDialog({
  file,
  open,
  onOpenChange,
  onAnalyze,
}: FileAnalysisDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
  const [copied, setCopied] = useState(false)

  const handleAnalyze = async () => {
    if (!file || !onAnalyze) return

    setIsAnalyzing(true)
    try {
      const result = await onAnalyze(file)
      setAnalysis(result)
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze file",
        status: "error",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied to clipboard",
        status: "success",
      })
    } catch {
      toast({
        title: "Failed to copy",
        status: "error",
      })
    }
  }

  const formatAnalysis = () => {
    if (!analysis) return ""
    
    let text = `File Analysis: ${file?.file_name}\n\n`
    text += `Summary:\n${analysis.summary}\n\n`
    
    if (analysis.keyPoints.length > 0) {
      text += `Key Points:\n${analysis.keyPoints.map(point => `• ${point}`).join('\n')}\n\n`
    }
    
    if (analysis.topics && analysis.topics.length > 0) {
      text += `Topics: ${analysis.topics.join(', ')}\n`
    }
    
    return text
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Analysis
          </DialogTitle>
          <DialogDescription>
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{file.file_name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {file.file_size ? formatBytes(file.file_size) : "Unknown size"}
                </span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!analysis && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">
                Ready to analyze your file
              </h3>
              <p className="mb-4 max-w-sm text-muted-foreground text-sm">
                Our AI will extract key information, provide a summary, and
                identify important topics from your file.
              </p>
              <Button onClick={handleAnalyze} disabled={!onAnalyze}>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze File
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing your file...</p>
            </div>
          )}

          {analysis && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Summary Section */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold">Summary</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatAnalysis())}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                {/* Key Points */}
                {analysis.keyPoints.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold">Key Points</h4>
                    <ul className="space-y-2">
                      {analysis.keyPoints.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-muted-foreground text-sm"
                        >
                          <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {analysis.fileType}
                  </Badge>
                  {analysis.language && (
                    <Badge variant="secondary">
                      {analysis.language}
                    </Badge>
                  )}
                  {analysis.complexity && (
                    <Badge
                      variant={
                        analysis.complexity === "complex"
                          ? "destructive"
                          : analysis.complexity === "moderate"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {analysis.complexity}
                    </Badge>
                  )}
                </div>

                {/* Topics */}
                {analysis.topics && analysis.topics.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold">Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.topics.map((topic) => (
                        <Badge key={topic} variant="outline">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}