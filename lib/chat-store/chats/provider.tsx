"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { toast } from "@/components/ui/toast"

import { MODEL_DEFAULT, SYSTEM_PROMPT_DEFAULT } from "../../config"
import type { Chats } from "../types"
import {
  createNewChat as createNewChatFromDb,
  deleteChat as deleteChatFromDb,
  fetchAndCacheChats,
  getCachedChats,
  updateChatModel as updateChatModelFromDb,
  updateChatTitle,
} from "./api"

interface ChatsContextType {
  chats: Chats[]
  refresh: () => Promise<void>
  isLoading: boolean
  updateTitle: (id: string, title: string) => Promise<void>
  deleteChat: (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => Promise<void>
  setChats: React.Dispatch<React.SetStateAction<Chats[]>>
  createNewChat: (
    userId: string,
    title?: string,
    model?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string,
    projectId?: string
  ) => Promise<Chats | undefined>
  resetChats: () => Promise<void>
  getChatById: (id: string) => Chats | undefined
  updateChatModel: (id: string, model: string) => Promise<void>
  bumpChat: (id: string) => Promise<void>
}
const ChatsContext = createContext<ChatsContextType | null>(null)

export function useChats() {
  const context = useContext(ChatsContext)
  if (!context) throw new Error("useChats must be used within ChatsProvider")
  return context
}

export function ChatsProvider({
  userId,
  children,
}: {
  userId?: string
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [chats, setChats] = useState<Chats[]>([])

  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setIsLoading(true)
      const cached = await getCachedChats()
      setChats(cached)

      try {
        const fresh = await fetchAndCacheChats(userId)
        setChats(fresh)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [userId])

  const refresh = async () => {
    if (!userId) return

    const fresh = await fetchAndCacheChats(userId)
    setChats(fresh)
  }

  const updateTitle = async (id: string, title: string) => {
    const prev = [...chats]
    const updatedChatWithNewTitle = prev.map((c) =>
      c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c
    )
    const sorted = updatedChatWithNewTitle.sort(
      (a, b) => +new Date(b.updated_at || "") - +new Date(a.updated_at || "")
    )
    setChats(sorted)
    try {
      await updateChatTitle(id, title)
    } catch {
      setChats(prev)
      toast({ title: "Failed to update title", status: "error" })
    }
  }

  const deleteChat = async (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => {
    const prev = [...chats]
    setChats((prev) => prev.filter((c) => c.id !== id))

    try {
      await deleteChatFromDb(id)
      if (id === currentChatId && redirect) redirect()
    } catch {
      setChats(prev)
      toast({ title: "Failed to delete chat", status: "error" })
    }
  }

  const createNewChat = async (
    userId: string,
    title?: string,
    model?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string,
    projectId?: string
  ) => {
    if (!userId) return
    const prev = [...chats]

    const optimisticId = `optimistic-${Date.now().toString()}`
    const optimisticChat = {
      id: optimisticId,
      title: title || "New Chat",
      created_at: new Date().toISOString(),
      model: model || MODEL_DEFAULT,
      system_prompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      user_id: userId,
      public: true,
      updated_at: new Date().toISOString(),
      project_id: null,
    }
    setChats((prev) => [optimisticChat, ...prev])

    try {
      const newChat = await createNewChatFromDb(
        userId,
        title,
        model,
        isAuthenticated,
        projectId
      )

      setChats((prev) => [
        newChat,
        ...prev.filter((c) => c.id !== optimisticId),
      ])

      return newChat
    } catch {
      setChats(prev)
      toast({ title: "Failed to create chat", status: "error" })
    }
  }

  const resetChats = async () => {
    setChats([])
  }

  const getChatById = (id: string) => {
    const chat = chats.find((c) => c.id === id)
    return chat
  }

  const updateChatModel = async (id: string, model: string) => {
    const prev = [...chats]
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, model } : c)))
    try {
      await updateChatModelFromDb(id, model)
    } catch {
      setChats(prev)
      toast({ title: "Failed to update model", status: "error" })
    }
  }

  const bumpChat = async (id: string) => {
    const prev = [...chats]
    const updatedChatWithNewUpdatedAt = prev.map((c) =>
      c.id === id ? { ...c, updated_at: new Date().toISOString() } : c
    )
    const sorted = updatedChatWithNewUpdatedAt.sort(
      (a, b) => +new Date(b.updated_at || "") - +new Date(a.updated_at || "")
    )
    setChats(sorted)
  }

  return (
    <ChatsContext.Provider
      value={{
        chats,
        refresh,
        updateTitle,
        deleteChat,
        setChats,
        createNewChat,
        resetChats,
        getChatById,
        updateChatModel,
        bumpChat,
        isLoading,
      }}
    >
      {children}
    </ChatsContext.Provider>
  )
}
