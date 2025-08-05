import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/app/types/database.types"

// Define Attachment type locally (removed from ai SDK v5)
export interface Attachment {
  name?: string
  contentType?: string
  url: string
}

export type SupabaseClientType = SupabaseClient<Database>

export interface ContentPart {
  type: string
  text?: string
  toolCallId?: string
  toolName?: string
  args?: Json
  result?: Json
  toolInvocation?: {
    state: string
    step: number
    toolCallId: string
    toolName: string
    args?: Json
    result?: Json
  }
  reasoningText?: string
  details?: Json[]
  artifact?: {
    id: string
    type: "code" | "document" | "html" | "data"
    title: string
    content: string
    language?: string
    metadata: {
      size: number
      lines?: number
      created: string
      modified?: string
    }
  }
}

export interface Message {
  id?: string
  role: "user" | "assistant" | "system" | "data" | "tool" | "tool-call"
  content: string | null | ContentPart[]
  reasoningText?: string
}

export interface ChatApiParams {
  userId: string
  model: string
  isAuthenticated: boolean
}

export interface LogUserMessageParams {
  supabase: SupabaseClientType
  userId: string
  chatId: string
  content: string
  attachments?: Attachment[]
  model: string
  isAuthenticated: boolean
  message_group_id?: string
}

export interface StoreAssistantMessageParams {
  supabase: SupabaseClientType
  chatId: string
  messages: Message[]
  message_group_id?: string
  model?: string
  artifactParts?: ContentPart[]
}

export interface ApiErrorResponse {
  error: string
  details?: string
}

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
