"use client"

import { Code, FileHtml, FileText, Database } from "@phosphor-icons/react/dist/ssr"

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

export function ArtifactPreview({ artifact, onClick, className }: ArtifactPreviewProps) {
  const Icon = typeIcons[artifact.type] || Code
  const label = typeLabels[artifact.type] || "Artifact"

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 border border-border rounded-lg",
        "bg-card hover:bg-accent transition-colors cursor-pointer",
        "text-left w-full max-w-md",
        className
      )}
    >
      <div className="flex-shrink-0 p-2 bg-muted rounded-md">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{artifact.title}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {label}
          </span>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {artifact.metadata?.size && (
            <span>{artifact.metadata.size.toLocaleString()} characters</span>
          )}
          {artifact.metadata?.lines && (
            <span> • {artifact.metadata.lines} lines</span>
          )}
          {artifact.language && (
            <span> • {artifact.language}</span>
          )}
        </div>
      </div>
      
      <div className="flex-shrink-0 text-muted-foreground">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}