"use client"

import {
  ArrowClockwise,
  Code,
  Copy,
  Download,
  Eye,
  X,
} from "@phosphor-icons/react/dist/ssr"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

import type { ContentPart } from "@/app/types/api.types"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { ArtifactDisplay } from "./artifact-display"

interface ArtifactPanelProps {
  isOpen: boolean
  onClose: () => void
  artifact: NonNullable<ContentPart["artifact"]> | null
}

export function ArtifactPanel({
  isOpen,
  onClose,
  artifact,
}: ArtifactPanelProps) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"source" | "preview">("source")
  const [reloadKey, setReloadKey] = useState(0)

  const copyContent = async () => {
    if (!artifact) return
    try {
      await navigator.clipboard.writeText(artifact.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const downloadFile = () => {
    if (!artifact) return
    const extension = getFileExtension(artifact.type, artifact.language)
    const slugifyFilename = (title: string) =>
      title
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")

    const filename = `${slugifyFilename(artifact.title)}${extension}`

    const blob = new Blob([artifact.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const reloadPreview = () => {
    setReloadKey((prev) => prev + 1)
  }

  return (
    <AnimatePresence>
      {isOpen && artifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "50%", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed top-0 right-0 z-[60] h-full overflow-hidden border-border border-l bg-background"
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-border border-b p-4">
              <h2 className="truncate pr-4 font-semibold text-lg">
                {artifact.title}
              </h2>
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  {/* Source/Preview Toggle - only show for previewable artifacts */}
                  {(artifact.type === "html" ||
                    artifact.type === "document" ||
                    (artifact.type === "code" &&
                      (artifact.language === "html" ||
                        artifact.language === "markdown"))) && (
                    <div className="flex rounded-md border">
                      <Button
                        variant={viewMode === "preview" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("preview")}
                        className={cn(
                          "h-8 rounded-r-none border-r px-2",
                          viewMode === "preview" && "shadow-sm"
                        )}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant={viewMode === "source" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("source")}
                        className={cn(
                          "h-8 rounded-l-none px-2",
                          viewMode === "source" && "shadow-sm"
                        )}
                      >
                        <Code className="mr-1 h-4 w-4" />
                        Source
                      </Button>
                    </div>
                  )}

                  {/* Reload button - only show in preview mode for previewable artifacts */}
                  {(artifact.type === "html" ||
                    artifact.type === "document" ||
                    (artifact.type === "code" &&
                      (artifact.language === "html" ||
                        artifact.language === "markdown"))) &&
                    viewMode === "preview" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={reloadPreview}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowClockwise className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reload preview</TooltipContent>
                      </Tooltip>
                    )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyContent}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {copied ? "Copied!" : "Copy content"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={downloadFile}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download file</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close panel</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <ArtifactDisplay
                artifact={artifact}
                isInPanel={true}
                viewMode={viewMode}
                reloadKey={reloadKey}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function getFileExtension(type: string, language?: string): string {
  if (type === "code" && language) {
    const extensions: Record<string, string> = {
      javascript: ".js",
      typescript: ".ts",
      python: ".py",
      html: ".html",
      css: ".css",
      json: ".json",
      sql: ".sql",
      yaml: ".yml",
      markdown: ".md",
      xml: ".xml",
      bash: ".sh",
      shell: ".sh",
      php: ".php",
      java: ".java",
      csharp: ".cs",
      cpp: ".cpp",
      c: ".c",
      go: ".go",
      rust: ".rs",
      swift: ".swift",
      kotlin: ".kt",
      ruby: ".rb",
    }
    return extensions[language] || ".txt"
  }

  const typeExtensions: Record<string, string> = {
    html: ".html",
    document: ".md",
    data: ".txt",
    code: ".txt",
  }

  return typeExtensions[type] || ".txt"
}
