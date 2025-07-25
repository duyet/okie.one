"use client"

import {
  Code,
  Database,
  FileHtml,
  FileText,
} from "@phosphor-icons/react/dist/ssr"

import type { ContentPart } from "@/app/types/api.types"
import { cn } from "@/lib/utils"

interface ArtifactPreviewProps {
  artifact: NonNullable<ContentPart["artifact"]>
  onClick: () => void
  className?: string
}

const typeIcons = {
  code: Code,
  html: FileHtml,
  document: FileText,
  data: Database,
} as const

const typeLabels = {
  code: "Code",
  html: "HTML",
  document: "Document",
  data: "Data",
} as const

export function ArtifactPreview({
  artifact,
  onClick,
  className,
}: ArtifactPreviewProps) {
  const Icon = typeIcons[artifact.type] || Code
  const label = typeLabels[artifact.type] || "Artifact"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border p-4",
        "cursor-pointer bg-card transition-colors hover:bg-accent",
        "w-full max-w-md text-left",
        className
      )}
    >
      <div className="flex-shrink-0 rounded-md bg-muted p-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-medium text-sm">{artifact.title}</span>
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {label}
          </span>
        </div>

        <div className="text-muted-foreground text-xs">
          {artifact.metadata?.size && (
            <span>{artifact.metadata.size.toLocaleString()} characters</span>
          )}
          {artifact.metadata?.lines && (
            <span> • {artifact.metadata.lines} lines</span>
          )}
          {artifact.language && <span> • {artifact.language}</span>}
        </div>
      </div>

      <div className="flex-shrink-0 text-muted-foreground">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label="Open artifact"
        >
          <title>Open artifact</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  )
}
