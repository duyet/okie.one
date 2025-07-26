"use client"

import { Clock, Lightning } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn, formatNumber } from "@/lib/utils"

interface UsageMetricsProps {
  messageId?: string
  chatId?: string
  userId?: string
  className?: string
  compact?: boolean
}

interface TokenUsageData {
  input_tokens: number
  output_tokens: number
  cached_tokens?: number
  duration_ms?: number
  time_to_first_token_ms?: number
  time_to_first_chunk_ms?: number
  streaming_duration_ms?: number
  estimated_cost_usd?: number
  created_at: string
}

export function UsageMetrics({
  messageId,
  chatId,
  userId,
  className = "",
  compact = false,
}: UsageMetricsProps) {
  const { data: tokenUsage, isLoading } = useQuery({
    queryKey: ["token-usage", messageId, chatId, userId],
    queryFn: async (): Promise<TokenUsageData | null> => {
      if (!messageId || !chatId || !userId) return null

      try {
        const response = await fetch(
          `/api/analytics/message-usage?messageId=${messageId}&chatId=${chatId}&userId=${userId}`
        )

        if (!response.ok) return null

        const data = await response.json()
        return data.length > 0 ? data[0] : null
      } catch (error) {
        console.error("Failed to fetch token usage:", error)
        return null
      }
    },
    enabled: !!(messageId && chatId && userId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  if (isLoading || !tokenUsage) {
    return null
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const formatCost = (cost: number): string => {
    if (cost < 0.001) return `<$0.001`
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(3)}`
  }

  const totalTokens =
    tokenUsage.input_tokens +
    tokenUsage.output_tokens +
    (tokenUsage.cached_tokens || 0)
  const hasTiming = tokenUsage.duration_ms || tokenUsage.time_to_first_chunk_ms
  const hasCachedTokens =
    tokenUsage.cached_tokens !== undefined && tokenUsage.cached_tokens !== null

  // Grok-style inline display - show just the duration like "1.1s"
  const primaryDuration =
    tokenUsage.duration_ms || tokenUsage.time_to_first_chunk_ms

  if (compact || !primaryDuration) {
    const compactContent = (
      <>
        {hasTiming && tokenUsage.duration_ms && (
          <div className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>{formatDuration(tokenUsage.duration_ms)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Lightning className="size-3" />
          <span>{formatNumber(totalTokens)}</span>
        </div>
        {tokenUsage.estimated_cost_usd && (
          <span className="text-green-600 dark:text-green-400">
            {formatCost(tokenUsage.estimated_cost_usd)}
          </span>
        )}
      </>
    )

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground",
              className
            )}
            type="button"
          >
            {compactContent}
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" className="w-64">
          <div className="space-y-2">
            <div className="font-medium text-foreground">Usage Details</div>

            {/* Token breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Input:</span>
                <span className="ml-1 font-mono">
                  {formatNumber(tokenUsage.input_tokens)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Output:</span>
                <span className="ml-1 font-mono">
                  {formatNumber(tokenUsage.output_tokens)}
                </span>
              </div>
              {hasCachedTokens && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Cached:</span>
                  <span className="ml-1 font-mono text-blue-500 dark:text-blue-400">
                    {formatNumber(tokenUsage.cached_tokens || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Timing details */}
            {hasTiming && (
              <div className="space-y-1 border-border border-t pt-2">
                {tokenUsage.time_to_first_chunk_ms && (
                  <div>
                    <span className="text-muted-foreground">
                      Time to first chunk:
                    </span>
                    <span className="ml-1 font-mono">
                      {formatDuration(tokenUsage.time_to_first_chunk_ms)}
                    </span>
                  </div>
                )}
                {tokenUsage.duration_ms && (
                  <div>
                    <span className="text-muted-foreground">
                      Response time:
                    </span>
                    <span className="ml-1 font-mono">
                      {formatDuration(tokenUsage.duration_ms)}
                    </span>
                  </div>
                )}
                {tokenUsage.streaming_duration_ms && (
                  <div>
                    <span className="text-muted-foreground">
                      Streaming time:
                    </span>
                    <span className="ml-1 font-mono">
                      {formatDuration(tokenUsage.streaming_duration_ms)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cost */}
            {tokenUsage.estimated_cost_usd && (
              <div className="border-border border-t pt-2">
                <span className="text-muted-foreground">Cost:</span>
                <span className="ml-1 font-medium font-mono text-green-600 dark:text-green-400">
                  {formatCost(tokenUsage.estimated_cost_usd)}
                </span>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  // Default: Grok-style simple duration display
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "cursor-pointer text-neutral-500 text-sm transition-colors hover:text-neutral-400",
            className
          )}
        >
          {formatDuration(primaryDuration)}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-64 text-xs">
        <div className="space-y-2">
          <div className="font-medium text-foreground">Usage Details</div>

          {/* Token breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Input:</span>
              <span className="ml-1 font-mono">
                {formatNumber(tokenUsage.input_tokens)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Output:</span>
              <span className="ml-1 font-mono">
                {formatNumber(tokenUsage.output_tokens)}
              </span>
            </div>
            {hasCachedTokens && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Cached:</span>
                <span className="ml-1 font-mono text-blue-500 dark:text-blue-400">
                  {formatNumber(tokenUsage.cached_tokens || 0)}
                </span>
              </div>
            )}
          </div>

          {/* Timing details */}
          {hasTiming && (
            <div className="space-y-1 border-border border-t pt-2">
              {tokenUsage.time_to_first_chunk_ms && (
                <div>
                  <span className="text-muted-foreground">
                    Time to first chunk:
                  </span>
                  <span className="ml-1 font-mono">
                    {formatDuration(tokenUsage.time_to_first_chunk_ms)}
                  </span>
                </div>
              )}
              {tokenUsage.duration_ms && (
                <div>
                  <span className="text-muted-foreground">Response time:</span>
                  <span className="ml-1 font-mono">
                    {formatDuration(tokenUsage.duration_ms)}
                  </span>
                </div>
              )}
              {tokenUsage.streaming_duration_ms && (
                <div>
                  <span className="text-muted-foreground">Streaming time:</span>
                  <span className="ml-1 font-mono">
                    {formatDuration(tokenUsage.streaming_duration_ms)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cost */}
          {tokenUsage.estimated_cost_usd && (
            <div className="border-border border-t pt-2">
              <span className="text-muted-foreground">Cost:</span>
              <span className="ml-1 font-medium font-mono text-green-600 dark:text-green-400">
                {formatCost(tokenUsage.estimated_cost_usd)}
              </span>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
