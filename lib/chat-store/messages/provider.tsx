"use client"

import { toast } from "@/components/ui/toast"
import type { Message as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useState } from "react"
import { clearAllIndexedDBStores, writeToIndexedDB } from "../persist"
import {
  addMessage,
  cacheMessages,
  clearMessagesForChat,
  fetchAndCacheMessages,
  getCachedMessages,
  setMessages as saveMessages,
} from "./api"

interface MessagesContextType {
  messages: MessageAISDK[]
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  reset: () => Promise<void>
  addMessage: (message: MessageAISDK) => Promise<void>
  saveAllMessages: (messages: MessageAISDK[]) => Promise<void>
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  resetMessages: () => Promise<void>
}

const MessagesContext = createContext<MessagesContextType | null>(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context)
    throw new Error("useMessages must be used within MessagesProvider")
  return context
}

export function MessagesProvider({
  chatId,
  children,
}: {
  chatId?: string
  children: React.ReactNode
}) {
  const [messages, setMessages] = useState<MessageAISDK[]>([])

  useEffect(() => {
    if (!chatId) return

    const load = async () => {
      const cached = await getCachedMessages(chatId)
      setMessages(cached)

      try {
        const fresh = await fetchAndCacheMessages(chatId)
        setMessages(fresh)
        cacheMessages(chatId, fresh)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }

    load()
  }, [chatId])

  const refresh = async () => {
    if (!chatId) return

    try {
      const fresh = await fetchAndCacheMessages(chatId)
      setMessages(fresh)
    } catch (e) {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

  const reset = async () => {
    if (!chatId) return

    setMessages([])
    await clearMessagesForChat(chatId)
  }

  const addSingleMessage = async (message: MessageAISDK) => {
    if (!chatId) return

    try {
      await addMessage(chatId, message)
      setMessages((prev) => [...prev, message])
    } catch (e) {
      toast({ title: "Failed to add message", status: "error" })
    }
  }

  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return

    try {
      const updated = [...messages, message]
      await writeToIndexedDB("messages", { id: chatId, messages: updated })
      setMessages(updated)
    } catch (e) {
      toast({ title: "Failed to save message", status: "error" })
    }
  }

  const saveAllMessages = async (newMessages: MessageAISDK[]) => {
    if (!chatId) return

    try {
      await saveMessages(chatId, newMessages)
      setMessages(newMessages)
    } catch (e) {
      toast({ title: "Failed to save messages", status: "error" })
    }
  }

  const resetMessages = async () => {
    setMessages([])
    await clearAllIndexedDBStores()
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        setMessages,
        refresh,
        reset,
        addMessage: addSingleMessage,
        saveAllMessages,
        cacheAndAddMessage,
        resetMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
