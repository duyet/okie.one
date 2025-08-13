"use client"

import type { UIMessage as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useState } from "react"
import { messageToUIMessage } from "@/lib/ai-sdk-types"

import { toast } from "@/components/ui/toast"
import { useChatSession } from "@/lib/chat-store/session/provider"

import { writeToIndexedDB } from "../persist"
import {
  cacheMessages,
  clearMessagesForChat,
  getCachedMessages,
  getMessagesFromDb,
  setMessages as saveMessages,
} from "./api"

interface MessagesContextType {
  messages: MessageAISDK[]
  isLoading: boolean
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  saveAllMessages: (messages: MessageAISDK[]) => Promise<void>
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  resetMessages: () => Promise<void>
  deleteMessages: () => Promise<void>
  setHasActiveChatSession: (active: boolean) => void
}

export const MessagesContext = createContext<MessagesContextType | null>(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context)
    throw new Error("useMessages must be used within MessagesProvider")
  return context
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<MessageAISDK[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { chatId } = useChatSession()
  const [, setHasActiveChatSession] = useState(false)

  useEffect(() => {
    // Only reset messages when navigating away from a chat, not during an active session
    // Remove this logic temporarily to fix the message persistence issue
    // TODO: Implement a better solution that doesn't clear messages during navigation
    if (chatId === null) {
      setIsLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    if (!chatId) return

    const load = async () => {
      setIsLoading(true)
      const cached = await getCachedMessages(chatId)
      setMessages(cached as any)

      try {
        const fresh = await getMessagesFromDb(chatId)
        setMessages(fresh)
        cacheMessages(chatId, fresh)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [chatId])

  const refresh = async () => {
    if (!chatId) return

    try {
      const fresh = await getMessagesFromDb(chatId)
      setMessages(fresh)
    } catch {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return

    try {
      // First add the message to local state
      setMessages((prev) => {
        const updated = [...prev, message]
        writeToIndexedDB("messages", { id: chatId, messages: updated })
        return updated
      })

      // Then refresh from database to get any server-added parts (artifacts, etc.)
      // Wait a bit to ensure the server has finished processing
      setTimeout(async () => {
        try {
          const fresh = await getMessagesFromDb(chatId)
          setMessages(fresh)
          cacheMessages(chatId, fresh)
        } catch (error) {
          console.error("Failed to refresh messages after caching:", error)
        }
      }, 1000) // 1 second delay to allow server processing
    } catch {
      toast({ title: "Failed to save message", status: "error" })
    }
  }

  const saveAllMessages = async (newMessages: MessageAISDK[]) => {
    // @todo: manage the case where the chatId is null (first time the user opens the chat)
    if (!chatId) return

    try {
      await saveMessages(chatId, newMessages)
      setMessages(newMessages)
    } catch {
      toast({ title: "Failed to save messages", status: "error" })
    }
  }

  const deleteMessages = async () => {
    if (!chatId) return

    setMessages([])
    await clearMessagesForChat(chatId)
  }

  const resetMessages = async () => {
    setMessages([])
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        isLoading,
        setMessages,
        refresh,
        saveAllMessages,
        cacheAndAddMessage,
        resetMessages,
        deleteMessages,
        setHasActiveChatSession,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
