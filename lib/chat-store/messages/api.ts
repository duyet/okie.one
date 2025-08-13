import type { UIMessage as MessageAISDK } from "@/lib/ai-sdk-types"
import { messageToUIMessage } from "@/lib/ai-sdk-types"

import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabled } from "@/lib/supabase/config"

import { readFromIndexedDB, writeToIndexedDB } from "../persist"

export async function getMessagesFromDb(
  chatId: string
): Promise<MessageAISDK[]> {
  // fallback to local cache only
  if (!isSupabaseEnabled) {
    const cached = await getCachedMessages(chatId)
    return cached
  }

  const supabase = createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, content, role, experimental_attachments, created_at, parts, message_group_id, model"
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (!data || error) {
    console.error("Failed to fetch messages:", error)
    return []
  }

  return data
    .filter((message) => message.role !== "data") // Filter out "data" role messages
    .map((message) =>
      messageToUIMessage({
        ...message,
        id: String(message.id),
        role: message.role as "system" | "user" | "assistant",
        content: message.content || "",
        parts: (message?.parts as any) || undefined,
        model: message.model || undefined,
        message_group_id: message.message_group_id || undefined,
      })
    )
}

async function insertMessageToDb(chatId: string, message: MessageAISDK) {
  const supabase = createClient()
  if (!supabase) return

  const textContent =
    message.parts
      ?.filter((p) => p.type === "text")
      ?.map((p) => p.text)
      ?.join("\n") || ""

  const attachments =
    message.parts
      ?.filter((p) => p.type === "file")
      ?.map((p) => ({
        name: (p as any).filename || (p as any).name || "file",
        contentType:
          (p as any).mediaType ||
          (p as any).contentType ||
          "application/octet-stream",
        url: (p as any).url || "",
      })) || []

  await supabase.from("messages").insert({
    chat_id: chatId,
    role: message.role,
    content: textContent,
    experimental_attachments: attachments.length > 0 ? attachments : undefined,
    created_at: new Date().toISOString(),
    message_group_id:
      (message as MessageAISDK & { message_group_id?: string })
        .message_group_id || null,
    model: (message as MessageAISDK & { model?: string }).model || null,
  })
}

async function insertMessagesToDb(chatId: string, messages: MessageAISDK[]) {
  const supabase = createClient()
  if (!supabase) return

  const payload = messages.map((message) => {
    const textContent =
      message.parts
        ?.filter((p) => p.type === "text")
        ?.map((p) => p.text)
        ?.join("\n") || ""

    const attachments =
      message.parts
        ?.filter((p) => p.type === "file")
        ?.map((p) => ({
          name: (p as any).filename || (p as any).name || "file",
          contentType:
            (p as any).mediaType ||
            (p as any).contentType ||
            "application/octet-stream",
          url: (p as any).url || "",
        })) || []

    return {
      chat_id: chatId,
      role: message.role,
      content: textContent,
      experimental_attachments:
        attachments.length > 0 ? attachments : undefined,
      created_at: new Date().toISOString(),
      message_group_id:
        (message as MessageAISDK & { message_group_id?: string })
          .message_group_id || null,
      model: (message as MessageAISDK & { model?: string }).model || null,
    }
  })

  await supabase.from("messages").insert(payload)
}

async function deleteMessagesFromDb(chatId: string) {
  const supabase = createClient()
  if (!supabase) return

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("chat_id", chatId)

  if (error) {
    console.error("Failed to clear messages from database:", error)
  }
}

type ChatMessageEntry = {
  id: string
  messages: MessageAISDK[]
}

export async function getCachedMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) =>
      +new Date((a as any).createdAt || 0) -
      +new Date((b as any).createdAt || 0)
  )
}

export async function cacheMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function addMessage(
  chatId: string,
  message: MessageAISDK
): Promise<void> {
  await insertMessageToDb(chatId, message)
  const current = await getCachedMessages(chatId)
  const updated = [...current, message]

  await writeToIndexedDB("messages", { id: chatId, messages: updated })
}

export async function setMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await insertMessagesToDb(chatId, messages)
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  await deleteMessagesFromDb(chatId)
  await clearMessagesCache(chatId)
}
