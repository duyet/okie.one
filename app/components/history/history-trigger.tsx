"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useChats } from "@/lib/chat-store/chats/provider"
import { ListMagnifyingGlass } from "@phosphor-icons/react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

export function HistoryTrigger() {
  const isMobile = useBreakpoint(768)
  const params = useParams<{ chatId: string }>()
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()
  const [isOpen, setIsOpen] = useState(false)

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    await deleteChat(id, params.chatId, () => router.push("/"))
  }

  const trigger = (
    <button
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
      type="button"
      onClick={() => setIsOpen(true)}
    >
      <ListMagnifyingGlass size={24} />
    </button>
  )

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
        trigger={trigger}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
      trigger={trigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  )
}
