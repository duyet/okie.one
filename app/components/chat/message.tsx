import type { UIMessage, Message as MessageType } from "@/lib/ai-sdk-types"
import { useState } from "react"

import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: Array<{
    name?: string
    contentType?: string
    url: string
  }>
  isLast?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
  toolInvocations?: Array<{ toolCall?: unknown; [key: string]: unknown }>
}

export function Message({
  variant,
  children,
  id,
  attachments,
  isLast,
  onDelete,
  onEdit,
  onReload,
  hasScrollAnchor,
  parts,
  status,
  className,
  toolInvocations,
}: MessageProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  if (variant === "user") {
    return (
      <MessageUser
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        onEdit={onEdit}
        onDelete={onDelete}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
        className={className}
      >
        {children}
      </MessageUser>
    )
  }

  if (variant === "assistant") {
    console.log("🔍 Message component - assistant message:", {
      id,
      children:
        typeof children === "string"
          ? `${children.substring(0, 200)}...`
          : children,
      parts: parts,
      partsCount: parts?.length || 0,
      partsTypes: parts?.map((p: any) => p?.type) || [],
      status,
    })

    return (
      <MessageAssistant
        id={id}
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        status={status}
        className={className}
        toolInvocations={toolInvocations}
      >
        {children}
      </MessageAssistant>
    )
  }

  return null
}
