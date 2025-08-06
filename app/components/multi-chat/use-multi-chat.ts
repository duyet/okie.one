import { useChat } from "@ai-sdk/react"
import type { ChatRequestOptions } from "ai"
import type { Message as UIMessage } from "@ai-sdk/ui-utils"
import { useMemo } from "react"

import { toast } from "@/components/ui/toast"

type ModelConfig = {
  id: string
  name: string
  provider: string
}

type ModelChat = {
  model: ModelConfig
  messages: UIMessage[]
  isLoading: boolean
  append: (
    message:
      | UIMessage
      | (Omit<UIMessage, "id" | "role"> & {
          id?: string
          role?: UIMessage["role"]
        }),
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  stop: () => void
}

// Maximum number of models we support
const MAX_MODELS = 10

export function useMultiChat(models: ModelConfig[]): ModelChat[] {
  function handleError(error: Error, model?: ModelConfig) {
    if (model) {
      console.error(`Error with ${model.name}:`, error)
      toast({
        title: `Error with ${model.name}`,
        description: error.message,
        status: "error",
      })
    }
  }

  // Create a fixed number of useChat hooks to avoid conditional hook calls
  const chat0 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[0]),
  })
  const chat1 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[1]),
  })
  const chat2 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[2]),
  })
  const chat3 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[3]),
  })
  const chat4 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[4]),
  })
  const chat5 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[5]),
  })
  const chat6 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[6]),
  })
  const chat7 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[7]),
  })
  const chat8 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[8]),
  })
  const chat9 = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => handleError(error, models[9]),
  })

  const chatHooks = useMemo(
    () => [
      chat0,
      chat1,
      chat2,
      chat3,
      chat4,
      chat5,
      chat6,
      chat7,
      chat8,
      chat9,
    ],
    [chat0, chat1, chat2, chat3, chat4, chat5, chat6, chat7, chat8, chat9]
  )

  // Map only the provided models to their corresponding chat hooks
  const activeChatInstances = useMemo(() => {
    return models.slice(0, MAX_MODELS).map((model, index) => {
      const chatHook = chatHooks[index]
      if (!chatHook) {
        throw new Error(`Chat hook not found for index ${index}`)
      }

      return {
        model,
        messages: chatHook.messages,
        isLoading: chatHook.status === "streaming",
        append: async (
          message:
            | UIMessage
            | (Omit<UIMessage, "id" | "role"> & {
                id?: string
                role?: UIMessage["role"]
              }),
          options?: ChatRequestOptions
        ) => {
          if ("id" in message && "role" in message) {
            chatHook.sendMessage(message as UIMessage)
          } else {
            chatHook.sendMessage({ text: (message as any).content || "" })
          }
          return null
        },
        stop: chatHook.stop,
      }
    })
  }, [models, chatHooks])

  return activeChatInstances
}
