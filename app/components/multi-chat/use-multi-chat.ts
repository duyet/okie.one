import { useChat } from "@ai-sdk/react"
import type { ChatRequestOptions } from "ai"
import type { UIMessage, Message } from "@/lib/ai-sdk-types"
import { uiMessageToMessage } from "@/lib/ai-sdk-types"
import { useMemo } from "react"

import { toast } from "@/components/ui/toast"

type ModelConfig = {
  id: string
  name: string
  provider: string
}

type ModelChat = {
  model: ModelConfig
  messages: Message[]
  isLoading: boolean
  append: (
    message:
      | Message
      | (Omit<Message, "id" | "role"> & {
          id?: string
          role?: Message["role"]
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
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[0]),
  } as any)
  const chat1 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[1]),
  } as any)
  const chat2 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[2]),
  } as any)
  const chat3 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[3]),
  } as any)
  const chat4 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[4]),
  } as any)
  const chat5 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[5]),
  } as any)
  const chat6 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[6]),
  } as any)
  const chat7 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[7]),
  } as any)
  const chat8 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[8]),
  } as any)
  const chat9 = useChat({
    api: "/api/chat",
    onError: (error: Error) => handleError(error, models[9]),
  } as any)

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
        messages: chatHook.messages.map((msg) =>
          uiMessageToMessage(msg as any)
        ),
        isLoading: chatHook.status === "streaming",
        append: async (
          message:
            | Message
            | (Omit<Message, "id" | "role"> & {
                id?: string
                role?: Message["role"]
              }),
          options?: ChatRequestOptions
        ) => {
          const content = message.content || ""
          await chatHook.sendMessage({
            role: "user",
            content,
          } as any)
          return null
        },
        stop: chatHook.stop,
      }
    })
  }, [models, chatHooks])

  return activeChatInstances
}
