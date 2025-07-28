import type { Message } from "@ai-sdk/react"
import { useCallback } from "react"
import { useRouter } from "next/navigation"

import { toast } from "@/components/ui/toast"
import { checkRateLimits } from "@/lib/api"
import type { Chats } from "@/lib/chat-store/types"
import { REMAINING_QUERY_ALERT_THRESHOLD } from "@/lib/config"

type UseChatOperationsProps = {
  isAuthenticated: boolean
  chatId: string | null
  messages: Message[]
  selectedModel: string
  systemPrompt: string
  createNewChat: (
    userId: string,
    title?: string,
    model?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string
  ) => Promise<Chats | undefined>
  setHasDialogAuth: (value: boolean) => void
  setHasRateLimitDialog?: (value: boolean) => void
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void
  setInput: (input: string) => void
}

export function useChatOperations({
  isAuthenticated,
  chatId,
  messages,
  selectedModel,
  systemPrompt,
  createNewChat,
  setHasDialogAuth,
  setHasRateLimitDialog,
  setMessages,
}: UseChatOperationsProps) {
  const router = useRouter()

  // Chat utilities
  const checkLimitsAndNotify = async (uid: string): Promise<boolean> => {
    try {
      const rateData = await checkRateLimits(uid, isAuthenticated)

      if (rateData.remaining === 0 && !isAuthenticated) {
        // Show rate limit dialog for guest users
        if (setHasRateLimitDialog) {
          setHasRateLimitDialog(true)
        } else {
          setHasDialogAuth(true)
        }
        return false
      }

      if (rateData.remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${rateData.remaining} quer${
            rateData.remaining === 1 ? "y" : "ies"
          } remaining today.`,
          status: "info",
        })
      }

      if (rateData.remainingPro === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${rateData.remainingPro} pro quer${
            rateData.remainingPro === 1 ? "y" : "ies"
          } remaining today.`,
          status: "info",
        })
      }

      return true
    } catch (err: unknown) {
      console.error("Rate limit check failed:", err)
      return false
    }
  }

  const ensureChatExists = async (userId: string, input: string) => {
    // For guest users, check for existing chat but validate it still exists
    if (!isAuthenticated) {
      const storedGuestChatId = localStorage.getItem("guestChatId")
      if (storedGuestChatId && messages.length > 0) {
        // Validate the chat still exists before reusing it
        try {
          // For guest users, we just verify the chat exists in our local state
          // since they don't have database access
          const chatExists = messages.some(
            (msg) => msg.chatId === storedGuestChatId
          )
          if (chatExists) {
            return storedGuestChatId
          } else {
            // Chat doesn't exist anymore, remove from localStorage
            localStorage.removeItem("guestChatId")
          }
        } catch (error) {
          console.error("Error validating guest chat:", error)
          localStorage.removeItem("guestChatId")
        }
      }
    }

    // Create new chat if no messages or need a fresh start
    if (
      messages.length === 0 ||
      (!isAuthenticated && !localStorage.getItem("guestChatId"))
    ) {
      try {
        console.log(
          "Creating new chat for",
          isAuthenticated ? "authenticated" : "guest",
          "user:",
          userId
        )

        const newChat = await createNewChat(
          userId,
          input,
          selectedModel,
          isAuthenticated,
          systemPrompt
        )

        if (!newChat) {
          console.error(
            "Failed to create new chat - createNewChat returned null/undefined"
          )
          return null
        }

        console.log("New chat created successfully:", newChat.id)

        if (isAuthenticated) {
          router.push(`/c/${newChat.id}`)
        } else {
          // Store guest chat ID for future reference and navigate to chat page
          localStorage.setItem("guestChatId", newChat.id)
          console.log("Stored guest chat ID:", newChat.id)
          router.push(`/c/${newChat.id}`)
        }

        return newChat.id
      } catch (err: unknown) {
        let errorMessage = "Something went wrong."

        // Handle different error formats
        if (err && typeof err === "object") {
          const errorObj = err as { message?: string; error?: string }

          if (errorObj.message) {
            try {
              // Try parsing as JSON error message
              const parsed = JSON.parse(errorObj.message)
              errorMessage = parsed.error || parsed.message || errorMessage
            } catch {
              // Fall back to plain message
              errorMessage = errorObj.message
            }
          } else if (errorObj.error) {
            errorMessage = errorObj.error
          }
        } else if (typeof err === "string") {
          errorMessage = err
        }

        console.error("Failed to create chat:", err)
        toast({
          title: errorMessage,
          status: "error",
        })
        return null
      }
    }

    // Use existing chatId
    return chatId
  }

  // Message handlers
  const handleDelete = useCallback(
    (id: string) => {
      setMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== id)
      )
    },
    [setMessages]
  )

  const handleEdit = useCallback(
    (id: string, newText: string) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message.id === id ? { ...message, content: newText } : message
        )
      )
    },
    [setMessages]
  )

  return {
    // Utils
    checkLimitsAndNotify,
    ensureChatExists,

    // Handlers
    handleDelete,
    handleEdit,
  }
}
