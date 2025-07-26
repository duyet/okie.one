"use client"

import { Clock, Lightning } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { formatNumber } from "@/lib/utils"

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
  compact = false 
}: UsageMetricsProps) {
  const [showDetailed, setShowDetailed] = useState(false)

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

  const totalTokens = tokenUsage.input_tokens + tokenUsage.output_tokens + (tokenUsage.cached_tokens || 0)
  const hasTiming = tokenUsage.duration_ms || tokenUsage.time_to_first_chunk_ms
  const hasCachedTokens = tokenUsage.cached_tokens && tokenUsage.cached_tokens > 0

  if (compact) {
    return (
      <button 
        className={`inline-flex items-center gap-2 text-muted-foreground text-xs ${className}`}
        onClick={() => setShowDetailed(!showDetailed)}
        type="button"
      >
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
      </button>
    )
  }

  return (
    <div className={`text-muted-foreground text-xs ${className}`}>
      <button 
        className="inline-flex cursor-pointer items-center gap-3 transition-colors hover:text-foreground"
        onClick={() => setShowDetailed(!showDetailed)}
        type="button"
      >
        {/* Duration */}
        {hasTiming && tokenUsage.duration_ms && (
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 opacity-70" />
            <span>{formatDuration(tokenUsage.duration_ms)}</span>
          </div>
        )}

        {/* Token Usage */}
        <div className="flex items-center gap-1.5">
          <Lightning className="size-3.5 opacity-70" />
          <span>
            {formatNumber(tokenUsage.input_tokens)}↑ / {formatNumber(tokenUsage.output_tokens)}↓
            {hasCachedTokens && (
              <span className="ml-1 text-blue-500 dark:text-blue-400">
                +{formatNumber(tokenUsage.cached_tokens!)}⚡
              </span>
            )}
          </span>
        </div>

        {/* Cost */}
        {tokenUsage.estimated_cost_usd && (
          <span className="text-green-600 dark:text-green-400 font-medium">
            {formatCost(tokenUsage.estimated_cost_usd)}
          </span>
        )}
      </button>

      {/* Detailed View */}
      {showDetailed && (
        <div className="mt-2 space-y-1 text-xs bg-muted/30 rounded-md p-2 border">
          <div className="font-medium text-foreground mb-1">Usage Details</div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Input tokens:</span>
              <span className="ml-1 font-mono">{formatNumber(tokenUsage.input_tokens)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Output tokens:</span>
              <span className="ml-1 font-mono">{formatNumber(tokenUsage.output_tokens)}</span>
            </div>
            
            {hasCachedTokens && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Cached tokens:</span>
                <span className="ml-1 font-mono text-blue-500 dark:text-blue-400">
                  {formatNumber(tokenUsage.cached_tokens!)}
                </span>
              </div>
            )}
            
            <div className="col-span-2">
              <span className="text-muted-foreground">Total tokens:</span>
              <span className="ml-1 font-mono font-medium">{formatNumber(totalTokens)}</span>
            </div>
          </div>

          {/* Timing Details */}
          {hasTiming && (
            <div className="mt-2 pt-2 border-t border-muted">
              <div className="font-medium text-foreground mb-1">Timing</div>
              <div className="grid grid-cols-1 gap-1">
                {tokenUsage.duration_ms && (
                  <div>
                    <span className="text-muted-foreground">Total time:</span>
                    <span className="ml-1 font-mono">{formatDuration(tokenUsage.duration_ms)}</span>
                  </div>
                )}
                {tokenUsage.time_to_first_chunk_ms && (
                  <div>
                    <span className="text-muted-foreground">Time to first response:</span>
                    <span className="ml-1 font-mono">{formatDuration(tokenUsage.time_to_first_chunk_ms)}</span>
                  </div>
                )}
                {tokenUsage.streaming_duration_ms && (
                  <div>
                    <span className="text-muted-foreground">Streaming time:</span>
                    <span className="ml-1 font-mono">{formatDuration(tokenUsage.streaming_duration_ms)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {tokenUsage.estimated_cost_usd && (
            <div className="mt-2 pt-2 border-t border-muted">
              <div className="font-medium text-foreground mb-1">Cost</div>
              <div>
                <span className="text-muted-foreground">Estimated cost:</span>
                <span className="ml-1 font-mono text-green-600 dark:text-green-400 font-medium">
                  {formatCost(tokenUsage.estimated_cost_usd)}
                </span>
              </div>
            </div>
          )}

          <div className="text-muted-foreground/70 text-xs mt-2">
            Recorded at {new Date(tokenUsage.created_at).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}