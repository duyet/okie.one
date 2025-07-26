import type { Message as MessageAISDK } from "@ai-sdk/react"
import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react"
import type React from "react"

import type { ContentPart } from "@/app/types/api.types"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import {
  isArtifactPart,
  isReasoningPart,
  isToolInvocationPart,
  type MessagePart,
} from "@/lib/type-guards/message-parts"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"

import { useArtifact } from "./artifact-context"
import { ArtifactPreview } from "./artifact-preview"
import { getSources } from "./get-sources"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"
import { UsageMetrics } from "./usage-metrics"

type MessageAssistantProps = {
  children: string
  id?: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  parts?: MessagePart[]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
}

// Define a type for tool invocation to avoid any usage
type ToolInvocationData = {
  state: string
  toolName: string
  result?: {
    content?: Array<{
      type: string
      results?: unknown[]
    }>
  }
}

export function MessageAssistant({
  children,
  id,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  parts,
  status,
  className,
}: MessageAssistantProps) {
  const { preferences } = useUserPreferences()
  const { openArtifact } = useArtifact()
  const { chatId } = useChatSession()
  const { user } = useUser()
  // Use proper type guards for safe type checking
  const sources = parts ? getSources(parts as MessageAISDK["parts"]) : undefined
  const toolInvocationParts = parts?.filter(isToolInvocationPart) || []
  const reasoningParts = parts?.find(isReasoningPart)
  const artifactParts = parts?.filter(isArtifactPart) || []

  // Debug logging (only when markers present for reduced noise)
  if (children.includes("[ARTIFACT_PREVIEW:") || artifactParts.length > 0) {
    console.log("🔍 MessageAssistant debug:", {
      hasArtifactMarkers: children.includes("[ARTIFACT_PREVIEW:"),
      artifactPartsCount: artifactParts.length,
      children: `${children.substring(0, 200)}...`,
      artifactParts: artifactParts.map((p) => p.artifact?.title),
    })
  }
  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast
  const searchImageResults =
    parts
      ?.filter((part) => {
        if (part.type !== "tool-invocation" || !part.toolInvocation)
          return false
        const ti = part.toolInvocation as ToolInvocationData
        return (
          ti.state === "result" &&
          ti.toolName === "imageSearch" &&
          ti.result?.content?.[0]?.type === "images"
        )
      })
      .flatMap((part) => {
        if (part.type !== "tool-invocation" || !part.toolInvocation) return []
        const ti = part.toolInvocation as ToolInvocationData
        return ti.state === "result" &&
          ti.toolName === "imageSearch" &&
          ti.result?.content?.[0]?.type === "images"
          ? (ti.result?.content?.[0]?.results ?? [])
          : []
      }) ?? []

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      <div className={cn("flex min-w-full flex-col gap-2", isLast && "pb-8")}>
        {reasoningParts && (
          <Reasoning
            reasoning={reasoningParts.reasoning}
            isStreaming={status === "streaming"}
          />
        )}

        {toolInvocationParts &&
          toolInvocationParts.length > 0 &&
          preferences.showToolInvocations && (
            <ToolInvocation
              toolInvocations={toolInvocationParts as ToolInvocationUIPart[]}
            />
          )}

        {searchImageResults.length > 0 && (
          <SearchImages
            results={
              searchImageResults as Array<{
                title: string
                imageUrl: string
                sourceUrl: string
              }>
            }
          />
        )}

        {contentNullOrEmpty ? null : (
          <div className="message-content-with-artifacts">
            {renderContentWithArtifacts(children, artifactParts, openArtifact)}
          </div>
        )}

        {sources && sources.length > 0 && <SourcesList sources={sources} />}

        {isLastStreaming || contentNullOrEmpty ? null : (
          <MessageActions
            className={cn(
              "-ml-2 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100"
            )}
          >
            <MessageAction
              tooltip={copied ? "Copied!" : "Copy text"}
              side="bottom"
            >
              <button
                className="flex size-7.5 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
                aria-label="Copy text"
                onClick={copyToClipboard}
                type="button"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </MessageAction>
            {isLast ? (
              <MessageAction
                tooltip="Regenerate"
                side="bottom"
                delayDuration={0}
              >
                <button
                  className="flex size-7.5 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
                  aria-label="Regenerate"
                  onClick={onReload}
                  type="button"
                >
                  <ArrowClockwise className="size-4" />
                </button>
              </MessageAction>
            ) : null}
            
            {/* Usage Metrics - show inline with actions */}
            {id && chatId && user?.id && (
              <div className="ml-2 flex items-center">
                <UsageMetrics
                  messageId={id}
                  chatId={chatId}
                  userId={user.id}
                  className="opacity-60 transition-opacity hover:opacity-100"
                />
              </div>
            )}
          </MessageActions>
        )}
      </div>
    </Message>
  )
}

/**
 * Render content with artifact preview cards replacing [ARTIFACT_PREVIEW:id] markers
 */
function renderContentWithArtifacts(
  content: string,
  artifactParts: MessagePart[],
  openArtifact: (artifact: NonNullable<ContentPart["artifact"]>) => void
): React.ReactNode {
  // Create a map of artifact IDs to artifacts
  const artifactMap = new Map<string, NonNullable<ContentPart["artifact"]>>()
  artifactParts.forEach((part) => {
    if (
      part.type === "artifact" &&
      part.artifact &&
      typeof part.artifact === "object" &&
      "id" in part.artifact
    ) {
      artifactMap.set(
        part.artifact.id as string,
        part.artifact as NonNullable<ContentPart["artifact"]>
      )
    }
  })

  // Check if content has artifact preview markers
  if (!content.includes("[ARTIFACT_PREVIEW:")) {
    return (
      <MessageContent
        className={cn(
          "prose dark:prose-invert relative min-w-full bg-transparent p-0",
          "prose-h2:mt-8 prose-h2:mb-3 prose-table:block prose-h1:scroll-m-20 prose-h2:scroll-m-20 prose-h3:scroll-m-20 prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-table:overflow-y-auto prose-h1:font-semibold prose-h2:font-medium prose-h3:font-medium prose-strong:font-medium prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base"
        )}
        markdown={true}
      >
        {content}
      </MessageContent>
    )
  }

  console.log("🔧 Processing content with artifact markers:", {
    contentLength: content.length,
    markersFound: content.match(/\[ARTIFACT_PREVIEW:([^\]]+)\]/g) || [],
    artifactCount: artifactParts.length,
  })

  // Split content by artifact preview markers and process
  const parts = content.split(/\[ARTIFACT_PREVIEW:([^\]]+)\]/)
  const elements: React.ReactNode[] = []

  console.log(
    "🔧 Split content into parts:",
    parts.length,
    parts.map((p, i) => ({
      index: i,
      isText: i % 2 === 0,
      content: `${p.substring(0, 50)}...`,
    }))
  )

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Regular text content
      const textContent = parts[i]
      if (textContent?.trim()) {
        console.log(
          `🔧 Adding text content at index ${i}:`,
          `${textContent.substring(0, 100)}...`
        )
        elements.push(
          <MessageContent
            key={`text-${i}`}
            className={cn(
              "prose dark:prose-invert relative min-w-full bg-transparent p-0",
              "prose-h2:mt-8 prose-h2:mb-3 prose-table:block prose-h1:scroll-m-20 prose-h2:scroll-m-20 prose-h3:scroll-m-20 prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-table:overflow-y-auto prose-h1:font-semibold prose-h2:font-medium prose-h3:font-medium prose-strong:font-medium prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base"
            )}
            markdown={true}
          >
            {textContent}
          </MessageContent>
        )
      }
    } else {
      // Artifact ID - replace with ArtifactPreview
      const artifactId = parts[i]
      const artifact = artifactMap.get(artifactId)
      console.log(`🔧 Processing artifact at index ${i}:`, {
        artifactId,
        hasArtifact: !!artifact,
        artifactTitle: artifact?.title,
      })
      if (artifact) {
        console.log(`🎨 Adding ArtifactPreview for: ${artifact.title}`)
        elements.push(
          <div key={`artifact-${artifactId}`} className="my-4">
            <ArtifactPreview
              artifact={artifact}
              onClick={() => openArtifact(artifact)}
            />
          </div>
        )
      }
    }
  }

  console.log("🔧 Final elements count:", elements.length)
  return <div className="space-y-2">{elements}</div>
}
