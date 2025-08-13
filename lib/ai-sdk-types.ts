/**
 * Type compatibility layer for AI SDK v5 migration
 * This file provides type aliases and utilities to bridge v4 and v5 differences
 */

import type { Message as UIUtilsMessage } from "@ai-sdk/ui-utils"

// Re-export the Message type from ui-utils as UIMessage for compatibility
export type UIMessage = UIUtilsMessage

// Extended Message type with content field for backward compatibility
export type Message = Omit<UIUtilsMessage, "role"> & {
  role: "system" | "user" | "assistant" | "data"
  content?: string
  model?: string
  message_group_id?: string
}

// Re-export for convenience
export type { UIUtilsMessage }

// Helper type for message parts
export interface MessagePart {
  type: string
  text?: string
  name?: string
  mediaType?: string
  url?: string
  data?: string
  [key: string]: any
}

// Helper to convert parts to the expected format
export function getFileParts(parts?: MessagePart[]): Array<{
  name: string
  mediaType?: string
  url?: string
  data?: string
}> {
  if (!parts) return []

  return parts
    .filter((part) => part.type === "file")
    .map((part) => ({
      name: part.name || "file",
      mediaType: part.mediaType,
      url: part.url,
      data: part.data,
    }))
}

// Helper to get text content from parts
export function getTextContent(parts?: MessagePart[]): string {
  if (!parts) return ""

  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("")
}

// Helper to convert UIMessage to legacy Message format
export function uiMessageToMessage(uiMessage: UIMessage): Message {
  return {
    id: uiMessage.id,
    role: uiMessage.role as "system" | "user" | "assistant" | "data",
    content: getTextContent(uiMessage.parts as MessagePart[]),
    parts: uiMessage.parts,
    createdAt: uiMessage.createdAt,
    // Preserve additional fields
    ...(uiMessage as any),
  }
}

// Helper to convert legacy Message to UIMessage format
export function messageToUIMessage(message: Message): UIMessage {
  const parts =
    message.parts ||
    (message.content ? [{ type: "text", text: message.content }] : [])

  return {
    id: message.id,
    role: message.role === "data" ? "system" : message.role,
    parts,
    createdAt: message.createdAt,
    // Preserve additional fields but exclude content
    ...Object.fromEntries(
      Object.entries(message).filter(([key]) => key !== "content")
    ),
  } as UIMessage
}
