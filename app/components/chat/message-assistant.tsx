import type { Message as MessageAISDK } from "@/lib/ai-sdk-types"
import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react"
import type React from "react"
import { useCallback, useMemo } from "react"

import { ReasoningDisplay as Reasoning } from "@/app/components/mcp/reasoning/reasoning-display"
import { ReasoningSteps } from "@/app/components/mcp/reasoning/sequential-steps"
import { ToolInvocation } from "@/app/components/mcp/tools/tool-invocation"
import type { ContentPart } from "@/app/types/api.types"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { useChatSession } from "@/lib/chat-store/session/provider"
import {
  isArtifactPart,
  isReasoningPart,
  isSequentialReasoningStepPart,
  isToolInvocationPart,
  type MessagePart,
} from "@/lib/type-guards/message-parts"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"

import { useArtifact } from "./artifact-context"
import { ArtifactPreview } from "./artifact-preview"
import { getSources } from "./get-sources"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
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
  // Add toolInvocations from AI SDK
  toolInvocations?: Array<{ toolCall?: unknown; [key: string]: unknown }>
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
  } & {
    title?: string
    content?: string
    nextStep?: "continue" | "finalAnswer"
  }
}

// Type guard to check if an object has the ToolInvocationData structure
function isToolInvocationData(obj: unknown): obj is ToolInvocationData {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "state" in obj &&
    "toolName" in obj &&
    typeof obj.state === "string" &&
    typeof obj.toolName === "string"
  )
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
  toolInvocations,
}: MessageAssistantProps) {
  const { preferences } = useUserPreferences()
  const { openArtifact } = useArtifact()
  const { chatId } = useChatSession()
  const { user } = useUser()

  console.log("🔍 MessageAssistant received:", {
    children: `"${children}"`,
    childrenType: typeof children,
    partsCount: parts?.length || 0,
    partsTypes: parts?.map((p) => p.type) || [],
    parts: parts,
    toolInvocationsCount: toolInvocations?.length || 0,
    toolInvocations: toolInvocations,
    status: status,
    isLast: isLast,
  })

  // Memoize the openArtifact handler to prevent unnecessary renders
  const handleOpenArtifact = useCallback(
    (artifact: NonNullable<ContentPart["artifact"]>) => {
      openArtifact(artifact)
    },
    [openArtifact]
  )
  // Use proper type guards for safe type checking
  const sources = parts ? getSources(parts as MessageAISDK["parts"]) : undefined
  const toolInvocationParts = parts?.filter(isToolInvocationPart) || []
  const reasoningParts = parts?.find(isReasoningPart)

  // Extract sequential reasoning steps from parts (added during streaming)
  const sequentialReasoningStepParts =
    parts?.filter(isSequentialReasoningStepPart) || []
  console.log("🔍 Found sequential reasoning step parts:", {
    count: sequentialReasoningStepParts.length,
    steps: sequentialReasoningStepParts.map((p) => p.step),
  })

  // Extract sequential reasoning steps from both sources: parts array and direct toolInvocations
  console.log(
    "🔍 Raw toolInvocationParts:",
    toolInvocationParts.map((part) => ({
      type: part.type,
      toolInvocation: part.toolInvocation,
      toolInvocationKeys: part.toolInvocation
        ? Object.keys(part.toolInvocation)
        : [],
    }))
  )

  // First, try to extract from parts array (existing logic)
  const sequentialReasoningStepsFromToolInvocationParts = toolInvocationParts
    .filter((part) => {
      const ti = part.toolInvocation as ToolInvocationData
      console.log("🔍 Checking tool invocation from parts:", {
        state: ti?.state,
        toolName: ti?.toolName,
        hasResult: !!ti?.result,
        resultKeys: ti?.result ? Object.keys(ti.result) : [],
        fullStructure: ti,
      })

      const isReasoningStep =
        ti?.state === "result" &&
        ti?.toolName === "addReasoningStep" &&
        ti?.result &&
        typeof ti.result === "object" &&
        "title" in ti.result &&
        "content" in ti.result

      if (isReasoningStep) {
        console.log("🧠 Found reasoning step from parts:", ti.result)
      }

      return isReasoningStep
    })
    .map((part) => {
      const ti = part.toolInvocation as ToolInvocationData
      return {
        title: ti.result?.title || "",
        content: ti.result?.content || "",
        nextStep: ti.result?.nextStep,
      }
    })

  // Second, try to extract from direct toolInvocations property (AI SDK structure)
  const sequentialReasoningStepsFromToolInvocations = (toolInvocations || [])
    .filter((toolInvocation): toolInvocation is ToolInvocationData => {
      if (!isToolInvocationData(toolInvocation)) return false
      const ti = toolInvocation
      console.log("🔍 Checking tool invocation from toolInvocations:", {
        state: ti?.state,
        toolName: ti?.toolName,
        hasResult: !!ti?.result,
        resultKeys: ti?.result ? Object.keys(ti.result) : [],
        fullStructure: ti,
      })

      const isReasoningStep =
        ti?.state === "result" &&
        ti?.toolName === "addReasoningStep" &&
        ti?.result &&
        typeof ti.result === "object" &&
        "title" in ti.result &&
        "content" in ti.result

      if (isReasoningStep) {
        console.log("🧠 Found reasoning step from toolInvocations:", ti.result)
      }

      return Boolean(isReasoningStep)
    })
    .map((toolInvocation) => ({
      title: toolInvocation.result?.title || "",
      content: toolInvocation.result?.content || "",
      nextStep: toolInvocation.result?.nextStep,
    }))

  // Extract steps from sequential reasoning step parts (added during streaming)
  const stepsFromSequentialParts = sequentialReasoningStepParts.map(
    (part) => part.step
  )

  // Combine all sources, preferring: sequential parts > toolInvocations > tool invocation parts
  const sequentialReasoningSteps =
    stepsFromSequentialParts.length > 0
      ? stepsFromSequentialParts
      : sequentialReasoningStepsFromToolInvocations.length > 0
        ? sequentialReasoningStepsFromToolInvocations
        : sequentialReasoningStepsFromToolInvocationParts

  console.log("🔍 Message debug:", {
    toolInvocationPartsCount: toolInvocationParts.length,
    directToolInvocationsCount: toolInvocations?.length || 0,
    sequentialReasoningStepPartsCount: sequentialReasoningStepParts.length,
    sequentialReasoningStepsFromToolInvocationPartsCount:
      sequentialReasoningStepsFromToolInvocationParts.length,
    sequentialReasoningStepsFromToolInvocationsCount:
      sequentialReasoningStepsFromToolInvocations.length,
    stepsFromSequentialPartsCount: stepsFromSequentialParts.length,
    finalSequentialReasoningStepsCount: sequentialReasoningSteps.length,
    toolNames: toolInvocationParts.map(
      (p) => (p.toolInvocation as ToolInvocationData)?.toolName
    ),
    directToolNames:
      toolInvocations
        ?.map((ti) => (isToolInvocationData(ti) ? ti.toolName : undefined))
        .filter(Boolean) || [],
    reasoningSteps: sequentialReasoningSteps,
  })

  // Memoize artifactParts to prevent unnecessary re-renders
  const artifactParts = useMemo(
    () => parts?.filter(isArtifactPart) || [],
    [parts]
  )

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

  // Memoize the content rendering to prevent unnecessary re-renders
  const renderedContent = useMemo(() => {
    // Always render content during streaming, even if empty - it may get populated
    if (children === null || (children === "" && !isLastStreaming)) return null
    return renderContentWithArtifacts(
      children,
      artifactParts,
      handleOpenArtifact
    )
  }, [children, artifactParts, handleOpenArtifact, isLastStreaming])

  // Show content container if we have content OR if we're streaming and have reasoning/tool parts
  const shouldShowContent =
    !contentNullOrEmpty ||
    (isLastStreaming &&
      (reasoningParts ||
        sequentialReasoningSteps.length > 0 ||
        toolInvocationParts.length > 0))

  console.log("🔍 MessageAssistant render decision:", {
    children: `"${children}"`,
    contentNullOrEmpty,
    isLastStreaming,
    reasoningPartsExists: !!reasoningParts,
    sequentialReasoningStepsCount: sequentialReasoningSteps.length,
    toolInvocationPartsCount: toolInvocationParts.length,
    shouldShowContent,
  })
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
            reasoning={reasoningParts.text}
            isStreaming={status === "streaming"}
          />
        )}

        {sequentialReasoningSteps.length > 0 && (
          <ReasoningSteps
            steps={sequentialReasoningSteps}
            isStreaming={status === "streaming"}
          />
        )}

        {toolInvocationParts &&
          toolInvocationParts.length > 0 &&
          preferences.showToolInvocations &&
          // Don't show tool invocations for addReasoningStep since we're displaying them as reasoning steps
          toolInvocationParts.filter(
            (part) =>
              (part.toolInvocation as ToolInvocationData)?.toolName !==
              "addReasoningStep"
          ).length > 0 && (
            <ToolInvocation
              toolInvocations={toolInvocationParts
                .filter(
                  (part) =>
                    (part.toolInvocation as ToolInvocationData)?.toolName !==
                    "addReasoningStep"
                )
                .map((part) => ({
                  type: "tool-invocation" as const,
                  toolInvocation: {
                    state: part.toolInvocation?.state || "unknown",
                    toolName: (part.toolInvocation as ToolInvocationData)?.toolName || "unknown",
                    toolCallId: part.toolInvocation?.toolCallId || "unknown",
                    args: part.toolInvocation?.args,
                    result: part.toolInvocation?.result as Record<string, unknown> | undefined,
                  },
                }))}
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

        {shouldShowContent && (
          <div className="message-content-with-artifacts">
            {renderedContent}
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
              onClick={() => {
                openArtifact(artifact)
              }}
            />
          </div>
        )
      }
    }
  }

  console.log("🔧 Final elements count:", elements.length)
  return <div className="space-y-2">{elements}</div>
}
