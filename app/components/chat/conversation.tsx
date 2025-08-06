import type { Message as MessageType } from "@ai-sdk/ui-utils"
import { useRef } from "react"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"

import { Message } from "./message"

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
}

export function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)

  if (!messages || messages.length === 0)
    return <div className="h-full w-full"></div>

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="flex h-app-header w-full bg-background lg:hidden lg:h-0" />
        <div className="mask-b-from-4% mask-b-to-100% flex h-app-header w-full bg-background lg:hidden" />
      </div>
      <ChatContainerRoot className="relative w-full">
        <ChatContainerContent
          className="flex w-full flex-col items-center pt-20 pb-4"
          style={{
            scrollbarGutter: "stable both-edges",
            scrollbarWidth: "none",
          }}
        >
          {messages?.map((message, index) => {
            const isLast =
              index === messages.length - 1 && status !== "submitted"
            const hasScrollAnchor =
              isLast && messages.length > initialMessageCount.current

            console.log("Rendering message:", message.id, "Role:", message.role)

            // Debug log for assistant messages with tool invocations
            if (message.role === "assistant") {
              console.log("🔍 Conversation - full message object:", {
                id: message.id,
                role: message.role,
                content: `${message.parts
                  ?.filter((p) => (p as { type?: string }).type === 'text')
                  ?.map((p) => (p as { text?: string }).text)
                  ?.join(' ')
                  ?.substring(0, 200)}...` || '',
                parts: message.parts,
                toolInvocations: (
                  message as MessageType & {
                    toolInvocations?: Array<{
                      toolCall?: unknown
                      [key: string]: unknown
                    }>
                  }
                ).toolInvocations,
                // Log all keys on the message object to see what's available
                messageKeys: Object.keys(message),
                fullMessage: message,
              })
            }

            return (
              <Message
                key={message.id}
                id={message.id}
                variant={message.role}
                attachments={message.parts
                  ?.filter((p) => (p as { type?: string }).type === 'file')
                  ?.map((p) => ({
                    name: p.name,
                    contentType: p.mediaType,
                    url: p.url || p.data || '',
                  })) || []}
                isLast={isLast}
                onDelete={onDelete}
                onEdit={onEdit}
                onReload={onReload}
                hasScrollAnchor={hasScrollAnchor}
                parts={message.parts}
                status={status}
                toolInvocations={
                  (
                    message as MessageType & {
                      toolInvocations?: Array<{
                        toolCall?: unknown
                        [key: string]: unknown
                      }>
                    }
                  ).toolInvocations
                }
              >
                {message.parts
                  ?.filter((p) => (p as { type?: string }).type === 'text')
                  ?.map((p) => (p as { text?: string }).text)
                  ?.join(' ') || ''}
              </Message>
            )
          })}
          {status === "submitted" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <div className="group flex min-h-scroll-anchor w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
                <Loader />
              </div>
            )}
          <div className="absolute bottom-0 flex w-full max-w-3xl flex-1 items-end justify-end gap-4 px-6 pb-2">
            <ScrollButton className="absolute top-[-50px] right-[30px]" />
          </div>
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  )
}
