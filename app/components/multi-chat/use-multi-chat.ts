// todo: fix this
/* eslint-disable-next-line react-hooks/rules-of-hooks */

import type {
  Message,
  CreateMessage,
  ChatRequestOptions,
} from "@ai-sdk/ui-utils"
import { useChat } from "@ai-sdk/react"
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
    message: Message | CreateMessage,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  stop: () => void
}

// Maximum number of models we support
const MAX_MODELS = 10

export function useMultiChat(models: ModelConfig[]): ModelChat[] {
  // Create a fixed number of useChat hooks to avoid conditional hook calls
  const chatHooks = Array.from({ length: MAX_MODELS }, (_, index) =>
    // todo: fix this
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // biome-ignore lint/correctness/useHookAtTopLevel: fix this
    useChat({
      api: "/api/chat",
      onError: (error) => {
        const model = models[index]
        if (model) {
          console.error(`Error with ${model.name}:`, error)
          toast({
            title: `Error with ${model.name}`,
            description: error.message,
            status: "error",
          })
        }
      },
    })
  )

  // Map only the provided models to their corresponding chat hooks
  const activeChatInstances = useMemo(() => {
    const instances = models.slice(0, MAX_MODELS).map((model, index) => {
      const chatHook = chatHooks[index]

      return {
        model,
        messages: chatHook.messages,
        isLoading: chatHook.isLoading,
        append: (
          message: Message | CreateMessage,
          options?: ChatRequestOptions
        ) => {
          return chatHook.append(message, options)
        },
        stop: chatHook.stop,
      }
    })

    return instances
    // todo: fix this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    models,
    ...chatHooks.flatMap((chat) => [chat.messages, chat.isLoading]),
    // Commenting out problematic dependency that doesn't exist
    // chatHooks[index],
  ])

  return activeChatInstances
}
