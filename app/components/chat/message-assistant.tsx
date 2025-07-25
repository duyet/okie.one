import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react"

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
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"

import { ArtifactDisplay } from "./artifact-display"
import { getSources } from "./get-sources"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  parts?: MessagePart[]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
}

export function MessageAssistant({
  children,
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
  // Use proper type guards for safe type checking
  const sources = parts ? getSources(parts as any) : undefined
  const toolInvocationParts = parts?.filter(isToolInvocationPart) || []
  const reasoningParts = parts?.find(isReasoningPart)
  const artifactParts = parts?.filter(isArtifactPart) || []
  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast
  const searchImageResults =
    parts
      ?.filter(
        (part) => {
          if (part.type !== "tool-invocation" || !part.toolInvocation) return false
          const ti = part.toolInvocation as any
          return (
            ti.state === "result" &&
            ti.toolName === "imageSearch" &&
            ti.result?.content?.[0]?.type === "images"
          )
        }
      )
      .flatMap((part) => {
        if (part.type !== "tool-invocation" || !part.toolInvocation) return []
        const ti = part.toolInvocation as any
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
            <ToolInvocation toolInvocations={toolInvocationParts as any} />
          )}

        {searchImageResults.length > 0 && (
          <SearchImages results={searchImageResults} />
        )}

        {contentNullOrEmpty ? null : (
          <MessageContent
            className={cn(
              "prose dark:prose-invert relative min-w-full bg-transparent p-0",
              "prose-h2:mt-8 prose-h2:mb-3 prose-table:block prose-h1:scroll-m-20 prose-h2:scroll-m-20 prose-h3:scroll-m-20 prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-table:overflow-y-auto prose-h1:font-semibold prose-h2:font-medium prose-h3:font-medium prose-strong:font-medium prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base"
            )}
            markdown={true}
          >
            {children}
          </MessageContent>
        )}

        {artifactParts && artifactParts.length > 0 && (
          <div className="artifacts-container">
            {artifactParts.map((part) =>
              part.artifact ? (
                <ArtifactDisplay
                  key={part.artifact.id}
                  artifact={part.artifact}
                />
              ) : null
            )}
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
          </MessageActions>
        )}
      </div>
    </Message>
  )
}
