"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

export type ChatHistory = {
  id: string
  title: string
  created_at: string
}

export function History() {
  const isMobile = useBreakpoint(768)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])

  useEffect(() => {
    const fetchChatHistory = async () => {
      const supabase = createClient()

      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth?.user) {
        return
      }

      const { data: chatHistory, error: chatHistoryError } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", auth.user.id)

      if (chatHistoryError) {
        console.error("Error fetching chat history:", chatHistoryError)
      }

      setChatHistory(chatHistory as ChatHistory[])
    }

    fetchChatHistory()
  }, [])

  const handleSaveEdit = async (id: string, newTitle: string) => {
    const supabase = await createClient()

    const { error } = await supabase
      .from("chats")
      .update({ title: newTitle })
      .eq("id", id)

    if (!error) {
      setChatHistory(
        chatHistory.map((chat) =>
          chat.id === id ? { ...chat, title: newTitle } : chat
        )
      )
    }
  }

  const handleConfirmDelete = async (id: string) => {
    const supabase = await createClient()

    const { error } = await supabase.from("chats").delete().eq("id", id)

    if (!error) {
      setChatHistory(chatHistory.filter((chat) => chat.id !== id))
    }
  }

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chatHistory}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chatHistory}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
    />
  )
}
