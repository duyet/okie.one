"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useChatHistory } from "@/lib/chat-store/chat-history-provider"
import { useParams, useRouter } from "next/navigation"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

export function History() {
  const isMobile = useBreakpoint(768)
  const params = useParams<{ chatId: string }>()
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChatHistory()

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    await deleteChat(id, params.chatId, () => router.push("/"))
  }

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
    />
  )
}
