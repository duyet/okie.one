"use client"

import {
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Copy,
  DotsThreeIcon,
  Download,
} from "@phosphor-icons/react"
import { useState } from "react"

import type { ContentPart } from "@/app/types/api.types"
import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block"
import { Markdown } from "@/components/prompt-kit/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useArtifact } from "./artifact-context"

interface ArtifactDisplayProps {
  artifact: NonNullable<ContentPart["artifact"]>
  className?: string
  isInPanel?: boolean
  viewMode?: "source" | "preview"
  reloadKey?: number
}

const ARTIFACT_ICONS = {
  code: "👨‍💻",
  document: "📄",
  html: "🌐",
  data: "📊",
} as const

const TRUNCATE_LENGTH = 300

export function ArtifactDisplay({
  artifact,
  className,
  isInPanel = false,
  viewMode = "source",
  reloadKey = 0,
}: ArtifactDisplayProps) {
  // Determine if this artifact can be previewed
  const canPreview =
    artifact.type === "html" ||
    artifact.type === "document" ||
    (artifact.type === "code" &&
      (artifact.language === "html" || artifact.language === "markdown"))

  // Force source mode for non-previewable artifacts
  const effectiveViewMode = canPreview ? viewMode : "source"
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const { openArtifact } = useArtifact()

  const toggleExpanded = () => setExpanded(!expanded)

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const downloadFile = () => {
    const extension = getFileExtension(artifact.type, artifact.language)
    // Replace only filesystem-unsafe characters with underscores for better readability
    const slugifyFilename = (title: string) =>
      title
        .replace(/[/\\?%*:|"<>]/g, "_") // Replace unsafe characters
        .replace(/\s+/g, "_") // Optionally replace spaces with underscores
        .replace(/_+/g, "_") // Collapse multiple underscores
        .replace(/^_+|_+$/g, "") // Trim leading/trailing underscores

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

  const openInPanel = () => {
    openArtifact(artifact)
  }

  const shouldTruncate = artifact.content.length > TRUNCATE_LENGTH
  const displayContent =
    expanded || !shouldTruncate
      ? artifact.content
      : `${artifact.content.substring(0, TRUNCATE_LENGTH)}...`

  return (
    <TooltipProvider>
      <div
        className={cn(
          "artifact-container",
          isInPanel ? "h-full w-full" : "my-3 border bg-muted/30 p-4",
          className
        )}
      >
        {/* Header - only show for inline artifacts, not in panel */}
        {!isInPanel && (
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base" role="img" aria-label={artifact.type}>
                {ARTIFACT_ICONS[artifact.type]}
              </span>
              <h3
                className="max-w-xs truncate font-medium text-sm"
                title={artifact.title}
              >
                {artifact.title}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {artifact.language || artifact.type}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {shouldTruncate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" onClick={toggleExpanded}>
                      {expanded ? (
                        <CaretUp className="h-4 w-4" />
                      ) : (
                        <CaretDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {expanded ? "Collapse" : "Expand"}
                  </TooltipContent>
                </Tooltip>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <DotsThreeIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={copyContent}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadFile}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openInPanel}>
                    <ArrowSquareOut className="mr-2 h-4 w-4" />
                    Open in panel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={cn("relative", isInPanel && "h-full")}>
          {artifact.type === "code" &&
            (!isInPanel || effectiveViewMode === "source" ? (
              <CodeBlock
                className={cn(
                  "border-none",
                  isInPanel
                    ? "h-full overflow-y-auto"
                    : "max-h-96 overflow-y-auto",
                  !isInPanel && !expanded && shouldTruncate && "max-h-48"
                )}
              >
                <CodeBlockCode
                  language={artifact.language || "text"}
                  code={isInPanel ? artifact.content : displayContent}
                />
              </CodeBlock>
            ) : // Preview mode for code artifacts with HTML or Markdown content
            artifact.language === "html" ? (
              <iframe
                key={`preview-${reloadKey}`}
                srcDoc={artifact.content}
                className="h-full w-full border-none"
                title={artifact.title}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : artifact.language === "markdown" ? (
              <div
                key={`markdown-preview-${reloadKey}`}
                className={cn(
                  "prose prose-sm dark:prose-invert h-full max-w-none overflow-y-auto p-4",
                  "prose-headings:my-3 prose-ol:my-2 prose-p:my-2 prose-ul:my-2"
                )}
              >
                <Markdown className="prose prose-sm dark:prose-invert prose-headings:my-3 prose-ol:my-2 prose-p:my-2 prose-ul:my-2 max-w-none">
                  {artifact.content}
                </Markdown>
              </div>
            ) : null)}

          {artifact.type === "html" && (
            <div className={cn("overflow-hidden", isInPanel && "h-full")}>
              {isInPanel ? (
                // In panel: respect effectiveViewMode
                effectiveViewMode === "preview" ? (
                  <iframe
                    key={`html-preview-${reloadKey}`}
                    srcDoc={artifact.content}
                    className="h-full w-full border-none"
                    title={artifact.title}
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <CodeBlock className="h-full overflow-y-auto border-none">
                    <CodeBlockCode language="html" code={artifact.content} />
                  </CodeBlock>
                )
              ) : // Inline: original behavior
              expanded ? (
                <iframe
                  key={`inline-preview-${reloadKey}`}
                  srcDoc={artifact.content}
                  className="h-96 w-full border-none"
                  title={artifact.title}
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <button
                  className="flex h-24 w-full cursor-pointer items-center justify-center border-0 bg-gradient-to-br from-blue-50 to-purple-50 text-muted-foreground transition-colors hover:bg-gradient-to-br hover:from-blue-100 hover:to-purple-100 dark:from-blue-950 dark:to-purple-950 dark:hover:from-blue-900 dark:hover:to-purple-900"
                  onClick={() => setExpanded(true)}
                  type="button"
                  aria-label="Preview HTML content"
                >
                  <span className="text-sm">Click to preview HTML</span>
                </button>
              )}
            </div>
          )}

          {artifact.type === "document" && (
            <div className={cn("overflow-hidden", isInPanel && "h-full")}>
              {isInPanel ? (
                // In panel: respect effectiveViewMode
                effectiveViewMode === "preview" ? (
                  <div
                    key={`document-preview-${reloadKey}`}
                    className={cn(
                      "prose prose-sm dark:prose-invert h-full max-w-none overflow-y-auto p-4",
                      "prose-headings:my-3 prose-ol:my-2 prose-p:my-2 prose-ul:my-2"
                    )}
                  >
                    <Markdown className="prose prose-sm dark:prose-invert prose-headings:my-3 prose-ol:my-2 prose-p:my-2 prose-ul:my-2 max-w-none">
                      {artifact.content}
                    </Markdown>
                  </div>
                ) : (
                  <CodeBlock className="h-full overflow-y-auto border-none">
                    <CodeBlockCode
                      language="markdown"
                      code={artifact.content}
                    />
                  </CodeBlock>
                )
              ) : (
                // Inline: original behavior
                <div
                  className={cn(
                    "prose prose-sm dark:prose-invert max-w-none",
                    "prose-headings:my-3 prose-ol:my-2 prose-p:my-2 prose-ul:my-2",
                    !expanded && shouldTruncate && "max-h-48 overflow-hidden"
                  )}
                >
                  <Markdown className="prose prose-sm dark:prose-invert prose-headings:my-3 prose-ol:my-2 prose-p:my-2 prose-ul:my-2 max-w-none">
                    {displayContent}
                  </Markdown>
                  {!expanded && shouldTruncate && (
                    <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t from-muted/30 to-transparent" />
                  )}
                </div>
              )}
            </div>
          )}

          {artifact.type === "data" && (
            <pre
              className={cn(
                "overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm",
                isInPanel
                  ? "h-full overflow-y-auto"
                  : !expanded && shouldTruncate && "max-h-48 overflow-y-hidden"
              )}
            >
              {isInPanel ? artifact.content : displayContent}
            </pre>
          )}
        </div>

        {/* Metadata Footer */}
        {expanded && artifact.metadata && (
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-muted-foreground text-xs">
            <span>
              {artifact.metadata.size.toLocaleString()} characters
              {artifact.metadata.lines && ` • ${artifact.metadata.lines} lines`}
            </span>
            <span>
              Created {new Date(artifact.metadata.created).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
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
