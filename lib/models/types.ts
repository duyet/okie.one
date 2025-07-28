import type { LanguageModelV1 } from "ai"

type ModelConfig = {
  id: string // "gpt-4.1-nano" // same from AI SDKs
  name: string // "GPT-4.1 Nano"
  provider: string // "OpenAI", "Mistral", etc.
  providerId: string // "openai", "mistral", etc.
  modelFamily?: string // "GPT-4", "Claude 3", etc.
  baseProviderId: string // "gemini" // same from AI SDKs

  description?: string // Short 1–2 line summary
  tags?: string[] // ["fast", "cheap", "vision", "OSS"]

  contextWindow?: number // in tokens
  inputCost?: number // USD per 1M input tokens
  outputCost?: number // USD per 1M output tokens
  priceUnit?: string // "per 1M tokens", "per image", etc.

  vision?: boolean
  tools?: boolean
  audio?: boolean
  reasoning?: boolean
  sequentialThinking?: boolean
  webSearch?: boolean
  openSource?: boolean

  speed?: "Fast" | "Medium" | "Slow"
  intelligence?: "Low" | "Medium" | "High"

  website?: string // official website (e.g. https://openai.com)
  apiDocs?: string // official API docs (e.g. https://platform.openai.com/docs/api-reference)
  modelPage?: string // official product page (e.g. https://x.ai/news/grok-2)
  releasedAt?: string // "2024-12-01" (optional, for tracking changes)

  icon?: string // e.g. "gpt-4", "claude", "mistral", or custom string

  // apiSdk?: () => LanguageModelV1 // "openai("gpt-4.1-nano")"
  apiSdk?: (
    apiKey?: string,
    opts?: { enableSearch?: boolean; enableThink?: boolean }
  ) => LanguageModelV1

  accessible?: boolean // true if the model is accessible to the user

  // File upload capabilities
  fileCapabilities?: {
    maxFiles: number // Maximum files per message
    maxFileSize: number // Max size per file in bytes
    supportedTypes: string[] // MIME types like "image/*", "application/pdf"
    features?: string[] // Capabilities like "image_analysis", "document_reading", "ocr"
  }
}

export type { ModelConfig }
