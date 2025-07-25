"use client"

import { ListMagnifyingGlass } from "@phosphor-icons/react/dist/ssr"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { useHydrationSafeBreakpoint } from "@/app/hooks/use-hydration-safe"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { cn } from "@/lib/utils"

import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

type HistoryTriggerProps = {
  hasSidebar: boolean
  classNameTrigger?: string
  icon?: React.ReactNode
  label?: React.ReactNode | string
  hasPopover?: boolean
}

export function HistoryTrigger({
  hasSidebar,
  classNameTrigger,
  icon,
  label,
  hasPopover = true,
}: HistoryTriggerProps) {
  const { isBelowBreakpoint: isMobile, isHydrated } = useHydrationSafeBreakpoint(768, false)
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()
  const { deleteMessages } = useMessages()
  const [isOpen, setIsOpen] = useState(false)
  const { chatId } = useChatSession()

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    if (id === chatId) {
      setIsOpen(false)
    }
    await deleteMessages()
    await deleteChat(id, chatId ?? "", () => router.push("/"))
  }

  const defaultTrigger = (
    <button
      className={cn(
        "pointer-events-auto rounded-full bg-background p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        hasSidebar ? "hidden" : "block",
        classNameTrigger
      )}
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label="Search"
      tabIndex={isHydrated ? (isMobile ? -1 : 0) : 0}
    >
      {icon || <ListMagnifyingGlass size={24} />}
      {label}
    </button>
  )

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
        trigger={defaultTrigger}
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
      trigger={defaultTrigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      onOpenChange={setIsOpen}
      hasPopover={hasPopover}
    />
  )
}
