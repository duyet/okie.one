import type { SupabaseClient } from "@supabase/supabase-js"

import type { ContentPart, Message } from "@/app/types/api.types"
import type { Database, Json } from "@/app/types/database.types"

const DEFAULT_STEP = 0

export async function saveFinalAssistantMessage(
  supabase: SupabaseClient<Database>,
  chatId: string,
  messages: Message[],
  message_group_id?: string,
  model?: string,
  artifactParts?: ContentPart[]
): Promise<string | null> {
  const parts: ContentPart[] = []
  const toolMap = new Map<string, ContentPart>()
  const textParts: string[] = []

  // Extract the assistant message ID from the AI SDK response
  const assistantMessage = messages.find((msg) => msg.role === "assistant")
  const assistantMessageId = assistantMessage?.id

  if (!assistantMessageId) {
    console.error("No assistant message ID found in AI SDK response")
    throw new Error("Assistant message ID is required for database storage")
  }

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          textParts.push(part.text || "")
          parts.push(part)
        } else if (part.type === "tool-invocation" && part.toolInvocation) {
          const { toolCallId, state } = part.toolInvocation
          if (!toolCallId) continue

          const existing = toolMap.get(toolCallId)
          if (state === "result" || !existing) {
            toolMap.set(toolCallId, {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                args: part.toolInvocation?.args || {},
              },
            })
          }
        } else if (part.type === "reasoning") {
          parts.push({
            type: "reasoning",
            reasoning: part.text || "",
            details: [
              {
                type: "text",
                text: part.text || "",
              },
            ],
          })
        } else if (part.type === "step-start") {
          parts.push(part)
        }
      }
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-result") {
          const toolCallId = part.toolCallId || ""
          toolMap.set(toolCallId, {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              step: DEFAULT_STEP,
              toolCallId,
              toolName: part.toolName || "",
              result: part.result,
            },
          })
        }
      }
    }
  }

  // Merge tool parts at the end
  parts.push(...toolMap.values())

  // Add artifact parts
  if (artifactParts && artifactParts.length > 0) {
    parts.push(...artifactParts)
  }

  const finalPlainText = textParts.join("\n\n")

  const { data, error } = await supabase
    .from("messages")
    .insert({
      id: assistantMessageId, // Use the AI SDK message ID
      chat_id: chatId,
      role: "assistant",
      content: finalPlainText || "",
      parts: parts as unknown as Json,
      message_group_id,
      model,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error saving final assistant message:", error)

    // If it's a foreign key constraint error, it means the chat doesn't exist
    // This can happen for guest users when anonymous auth is disabled
    if (error.code === "23503") {
      console.log(
        "Chat doesn't exist in database (likely a guest user without proper auth). Skipping message save."
      )
      return null
    }

    throw new Error(`Failed to save assistant message: ${error.message}`)
  } else {
    console.log("Assistant message saved successfully (merged).")
    return data?.id || null
  }
}
