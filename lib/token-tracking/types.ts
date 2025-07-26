// Token usage tracking types and interfaces

export interface TokenUsage {
  id?: string
  user_id: string
  chat_id: string
  message_id: string
  provider_id: string
  model_id: string
  input_tokens: number
  output_tokens: number
  cached_tokens?: number
  total_tokens?: number // Computed by database
  duration_ms?: number
  time_to_first_token_ms?: number
  time_to_first_chunk_ms?: number
  streaming_duration_ms?: number
  estimated_cost_usd?: number
  cost_per_input_token_usd?: number
  cost_per_output_token_usd?: number
  created_at?: string
  updated_at?: string
}

export interface DailyTokenUsage {
  id?: string
  user_id: string
  usage_date: string
  provider_id: string
  model_id: string
  total_input_tokens: number
  total_output_tokens: number
  total_cached_tokens?: number
  total_tokens?: number // Computed by database
  message_count: number
  total_duration_ms: number
  average_duration_ms?: number // Computed by database
  estimated_cost_usd?: number
  created_at?: string
  updated_at?: string
}

export interface TokenUsageMetrics {
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  totalTokens: number
  durationMs?: number
  timeToFirstTokenMs?: number
  timeToFirstChunkMs?: number
  streamingDurationMs?: number
  estimatedCost?: number
  costPerInputToken?: number
  costPerOutputToken?: number
}

export interface LeaderboardEntry {
  user_id: string
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cached_tokens: number
  total_messages: number
  total_cost_usd: number
  avg_duration_ms: number
  avg_time_to_first_token_ms?: number
  top_provider: string
  top_model: string
  // Additional fields from user profile if needed
  display_name?: string
  avatar_url?: string
}

export interface UserAnalytics {
  usage_date: string
  total_tokens: number
  total_messages: number
  total_cost_usd: number
  providers: Array<{
    provider: string
    tokens: number
  }>
  models: Array<{
    model: string
    tokens: number
  }>
}

export interface TokenTrackingConfig {
  enabled: boolean
  trackCosts: boolean
  costPerInputToken: Record<string, number> // provider-model -> cost per 1k input tokens
  costPerOutputToken: Record<string, number> // provider-model -> cost per 1k output tokens
}

// Cost estimation models (prices per 1K tokens in USD)
export const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI models
  "openai-gpt-4o": { input: 0.0025, output: 0.01 },
  "openai-gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "openai-gpt-4-turbo": { input: 0.01, output: 0.03 },
  "openai-gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },

  // Anthropic models
  "anthropic-claude-3.5-sonnet": { input: 0.003, output: 0.015 },
  "anthropic-claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "anthropic-claude-3-opus": { input: 0.015, output: 0.075 },

  // Google models
  "google-gemini-1.5-pro": { input: 0.001, output: 0.002 },
  "google-gemini-1.5-flash": { input: 0.00007, output: 0.0003 },

  // Mistral models
  "mistral-large": { input: 0.004, output: 0.012 },
  "mistral-small": { input: 0.001, output: 0.003 },

  // Default fallback
  default: { input: 0.001, output: 0.002 },
}

export function calculateTokenCost(
  providerModel: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = TOKEN_COSTS[providerModel] || TOKEN_COSTS.default
  return (inputTokens * costs.input + outputTokens * costs.output) / 1000
}

export function getProviderModelKey(
  providerId: string,
  modelId: string
): string {
  return `${providerId}-${modelId}`
}

export interface TimingAnalytics {
  usage_date: string
  avg_duration_ms: number
  avg_time_to_first_token_ms: number
  avg_time_to_first_chunk_ms: number
  avg_streaming_duration_ms: number
  message_count: number
  provider_timings: Array<{
    provider: string
    model: string
    avg_duration: number
    avg_ttft: number
  }>
}

export interface DetailedTimingMetrics {
  requestStartTime: number
  timeToFirstToken?: number
  timeToFirstChunk?: number
  streamingStartTime?: number
  streamingEndTime?: number
  requestEndTime: number
}

export class TokenTrackingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = "TokenTrackingError"
  }
}
