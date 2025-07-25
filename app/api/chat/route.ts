import type { Attachment } from "@ai-sdk/ui-utils"
import { type Message as MessageAISDK, streamText, type ToolSet } from "ai"

import { parseArtifacts } from "@/lib/artifacts/parser"
import { SYSTEM_PROMPT_DEFAULT, MAX_FILES_PER_MESSAGE } from "@/lib/config"
import {
  validateModelSupportsFiles,
  getModelFileCapabilities,
} from "@/lib/file-handling"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import type { ProviderWithoutOllama } from "@/lib/user-keys"

import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse, extractErrorMessage } from "./utils"

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  enableSearch: boolean
  message_group_id?: string
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      message_group_id,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    // Increment message count for successful validation
    if (supabase) {
      await incrementMessageCount({ supabase, userId })
    }

    const userMessage = messages[messages.length - 1]
    const attachments =
      (userMessage?.experimental_attachments as Attachment[]) || []

    // Validate file attachments for the selected model
    if (attachments.length > 0) {
      // Check if model supports files
      if (!validateModelSupportsFiles(model)) {
        return new Response(
          JSON.stringify({
            error:
              "This model does not support file attachments. Please select a vision-enabled model like GPT-4, Claude, or Gemini.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      // Check file count limits
      const capabilities = getModelFileCapabilities(model)
      const maxFiles = capabilities?.maxFiles
        ? Math.min(capabilities.maxFiles, MAX_FILES_PER_MESSAGE)
        : MAX_FILES_PER_MESSAGE

      if (attachments.length > maxFiles) {
        return new Response(
          JSON.stringify({
            error: `This model supports maximum ${maxFiles} files per message. You have ${attachments.length} files.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }
    }

    if (supabase && userMessage?.role === "user") {
      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: userMessage.content,
        attachments: attachments,
        model,
        isAuthenticated,
        message_group_id,
      })
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT

    let apiKey: string | undefined
    if (isAuthenticated && userId) {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
      const provider = getProviderForModel(model)
      apiKey =
        (await getEffectiveApiKey(userId, provider as ProviderWithoutOllama)) ||
        undefined
    }

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch }),
      system: effectiveSystemPrompt,
      messages: messages,
      tools: {} as ToolSet,
      maxSteps: 10,
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
        // Don't set streamError anymore - let the AI SDK handle it through the stream
      },

      onFinish: async ({ response }) => {
        // Parse artifacts from the response text for all users (not just Supabase users)
        const responseText = response.messages
          .filter((msg) => msg.role === "assistant")
          .map((msg) =>
            typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n")
                : ""
          )
          .join("\n")

        const artifactParts = parseArtifacts(responseText, false)
        console.log(
          "Parsed artifacts:",
          artifactParts.length,
          "from response length:",
          responseText.length
        )

        // Store in database only if Supabase is available
        if (supabase) {
          await storeAssistantMessage({
            supabase,
            chatId,
            messages:
              response.messages as unknown as import("@/app/types/api.types").Message[],
            message_group_id,
            model,
            artifactParts,
          })
        }
      },
    })

    return result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
      getErrorMessage: (error: unknown) => {
        console.error("Error forwarded to client:", error)
        return extractErrorMessage(error)
      },
    })
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
