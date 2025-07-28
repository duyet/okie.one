"use client"

import { ChatCircleIcon, Check, X } from "@phosphor-icons/react"
import Link from "next/link"
import { useCallback, useMemo, useRef, useState } from "react"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import useClickOutside from "@/app/hooks/use-click-outside"
import { useChats } from "@/lib/chat-store/chats/provider"
import type { Chat } from "@/lib/chat-store/types"
import { cn } from "@/lib/utils"

import { SidebarItemMenu } from "./sidebar-item-menu"

type ProjectChatItemProps = {
  chat: Chat
  formatDate: (dateString: string) => string
}

export function ProjectChatItem({ chat, formatDate }: ProjectChatItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chat.title || "")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastChatTitleRef = useRef(chat.title)
  const { updateTitle } = useChats()
  const isMobile = useBreakpoint(768)
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (!isEditing && lastChatTitleRef.current !== chat.title) {
    lastChatTitleRef.current = chat.title
    setEditTitle(chat.title || "")
  }

  const handleStartEditing = useCallback(() => {
    setIsEditing(true)
    setEditTitle(chat.title || "")

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    })
  }, [chat.title])

  const handleSave = useCallback(async () => {
    setIsEditing(false)
    setIsMenuOpen(false)
    await updateTitle(chat.id, editTitle)
  }, [chat.id, editTitle, updateTitle])

  const handleCancel = useCallback(() => {
    setEditTitle(chat.title || "")
    setIsEditing(false)
    setIsMenuOpen(false)
  }, [chat.title])

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setIsMenuOpen(open)
  }, [])

  const handleClickOutside = useCallback(() => {
    if (isEditing) {
      handleSave()
    }
  }, [isEditing, handleSave])

  useClickOutside(containerRef, handleClickOutside)

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditTitle(e.target.value)
    },
    []
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSave()
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const handleSaveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      handleSave()
    },
    [handleSave]
  )

  const handleCancelClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      handleCancel()
    },
    [handleCancel]
  )

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Memoize computed values
  const displayTitle = useMemo(
    () => chat.title || "Untitled Chat",
    [chat.title]
  )

  const containerClassName = useMemo(
    () =>
      cn(
        "border-border hover:bg-accent/50 group/chat relative rounded-lg border transition-colors",
        isEditing || isMenuOpen ? "bg-accent/50" : ""
      ),
    [isEditing, isMenuOpen]
  )

  const menuClassName = useMemo(
    () =>
      cn(
        "absolute top-3 right-3 opacity-0 transition-opacity group-hover/chat:opacity-100",
        isMobile && "opacity-100 group-hover/chat:opacity-100"
      ),
    [isMobile]
  )

  if (isEditing) {
    return (
      <div className={containerClassName} ref={containerRef}>
        <div className="flex items-center p-3">
          <ChatCircleIcon
            size={16}
            className="mr-3 flex-shrink-0 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={editTitle}
            onChange={handleInputChange}
            className="flex-1 bg-transparent font-medium text-primary text-sm focus:outline-none"
            onKeyDown={handleKeyDown}
          />
          <div className="ml-2 flex gap-1">
            <button
              onClick={handleSaveClick}
              className="flex size-6 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-primary"
              type="button"
            >
              <Check size={12} weight="bold" />
            </button>
            <button
              onClick={handleCancelClick}
              className="flex size-6 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-primary"
              type="button"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName} ref={containerRef}>
      <Link
        href={`/c/${chat.id}`}
        className="block p-3"
        onClick={handleLinkClick}
        prefetch
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{displayTitle}</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {chat.updated_at
                ? formatDate(chat.updated_at)
                : chat.created_at
                  ? formatDate(chat.created_at)
                  : null}
            </p>
          </div>
        </div>
      </Link>

      <div className={menuClassName} key={chat.id}>
        <SidebarItemMenu
          chat={chat}
          onStartEditing={handleStartEditing}
          onMenuOpenChange={handleMenuOpenChange}
        />
      </div>
    </div>
  )
}
