import { MessageContent } from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"

type ChatPreviewPanelProps = {
  chatId: string | null
  onHover?: (isHovering: boolean) => void
  messages?: ChatMessage[]
  isLoading?: boolean
  error?: string | null
  onFetchPreview?: (chatId: string) => Promise<void>
}

type ChatMessage = {
  id: string
  content: string
  role: "user" | "assistant"
  created_at: string
}

type MessageBubbleProps = {
  content: string
  role: "user" | "assistant"
  timestamp: string
}

function MessageBubble({ content, role }: MessageBubbleProps) {
  const isUser = role === "user"

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <MessageContent
            className="relative rounded-3xl bg-accent px-5 py-2.5"
            markdown={true}
            components={{
              code: ({ children }) => <>{children}</>,
              pre: ({ children }) => <>{children}</>,
              h1: ({ children }) => <p>{children}</p>,
              h2: ({ children }) => <p>{children}</p>,
              h3: ({ children }) => <p>{children}</p>,
              h4: ({ children }) => <p>{children}</p>,
              h5: ({ children }) => <p>{children}</p>,
              h6: ({ children }) => <p>{children}</p>,
              p: ({ children }) => <p>{children}</p>,
              li: ({ children }) => <p>- {children}</p>,
              ul: ({ children }) => <>{children}</>,
              ol: ({ children }) => <>{children}</>,
            }}
          >
            {content}
          </MessageContent>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[400px]">
        <MessageContent
          className="bg-transparent p-0 text-foreground text-sm"
          markdown={true}
          components={{
            h1: ({ children }) => (
              <div className="mb-1 font-semibold text-base">{children}</div>
            ),
            h2: ({ children }) => (
              <div className="mb-1 font-medium text-sm">{children}</div>
            ),
            h3: ({ children }) => (
              <div className="mb-1 font-medium text-sm">{children}</div>
            ),
            h4: ({ children }) => (
              <div className="font-medium text-sm">{children}</div>
            ),
            h5: ({ children }) => (
              <div className="font-medium text-sm">{children}</div>
            ),
            h6: ({ children }) => (
              <div className="font-medium text-sm">{children}</div>
            ),
            p: ({ children }) => <div className="mb-1">{children}</div>,
            li: ({ children }) => <div>• {children}</div>,
            ul: ({ children }) => <div className="space-y-0.5">{children}</div>,
            ol: ({ children }) => <div className="space-y-0.5">{children}</div>,
            code: ({ children }) => (
              <code className="rounded bg-muted px-1 text-xs">{children}</code>
            ),
            pre: ({ children }) => (
              <div className="overflow-x-auto rounded bg-muted p-2 text-xs">
                {children}
              </div>
            ),
          }}
        >
          {content}
        </MessageContent>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading messages...</span>
      </div>
    </div>
  )
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  const isNetworkError =
    error.includes("fetch") ||
    error.includes("network") ||
    error.includes("HTTP") ||
    error.includes("Failed to fetch")

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="max-w-[300px] space-y-3 text-center text-muted-foreground">
        <div className="flex justify-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-sm">Failed to load preview</p>
          <p className="break-words text-xs opacity-70">{error}</p>
        </div>
        {isNetworkError && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-32 items-center justify-center p-4">
      <p className="text-center text-muted-foreground text-sm">
        No messages in this conversation yet
      </p>
    </div>
  )
}

function DefaultState() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="space-y-2 text-center text-muted-foreground">
        <p className="text-sm opacity-60">Select a conversation to preview</p>
      </div>
    </div>
  )
}

export function ChatPreviewPanel({
  chatId,
  onHover,
  messages = [],
  isLoading = false,
  error = null,
  onFetchPreview,
}: ChatPreviewPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [lastChatId, setLastChatId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  const shouldFetch = chatId && chatId !== lastChatId

  if (shouldFetch && onFetchPreview) {
    setLastChatId(chatId)
    setRetryCount(0)
    onFetchPreview(chatId)
  }

  const handleRetry = () => {
    if (chatId && onFetchPreview && retryCount < maxRetries) {
      setRetryCount((prev) => prev + 1)
      onFetchPreview(chatId)
    }
  }

  // Immediately scroll to bottom when chatId changes or messages load
  useLayoutEffect(() => {
    if (chatId && messages.length > 0 && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [chatId, messages.length])

  return (
    <div
      className="col-span-3 border-l bg-background"
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      key={chatId}
      role="region"
      aria-label="Chat preview"
    >
      <div className="h-[480px]">
        {!chatId && <DefaultState />}
        {chatId && isLoading && <LoadingState />}
        {chatId && error && !isLoading && (
          <ErrorState
            error={error}
            onRetry={retryCount < maxRetries ? handleRetry : undefined}
          />
        )}
        {chatId && !isLoading && !error && messages.length === 0 && (
          <EmptyState />
        )}
        {chatId && !isLoading && !error && messages.length > 0 && (
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="space-y-4 p-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-muted/50 px-2 py-1 text-muted-foreground text-xs">
                  Last {messages.length} messages
                </div>
              </div>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  content={message.content}
                  role={message.role}
                  timestamp={message.created_at}
                />
              ))}
            </div>
            <div ref={bottomRef} />
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
