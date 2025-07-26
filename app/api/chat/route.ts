import type { Attachment } from "@ai-sdk/ui-utils"
import { type Message as MessageAISDK, streamText, type ToolSet } from "ai"

import { parseArtifacts } from "@/lib/artifacts/parser"
import { MAX_FILES_PER_MESSAGE, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import {
  getModelFileCapabilities,
  validateModelSupportsFiles,
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
import { recordTokenUsage } from "@/lib/token-tracking/api"
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
  const requestStartTime = Date.now()
  let assistantMessageId: string | null = null
  let timeToFirstToken: number | undefined
  let timeToFirstChunk: number | undefined
  let streamingStartTime: number | undefined

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
      onChunk: (chunk) => {
        if (!timeToFirstChunk) {
          timeToFirstChunk = Date.now() - requestStartTime
          streamingStartTime = Date.now()
        }
        // Track first token timing from chunk data
        if (!timeToFirstToken && chunk.chunk?.type === "text-delta") {
          timeToFirstToken = Date.now() - requestStartTime
        }
      },

      onFinish: async ({ response, usage, finishReason }) => {
        // Log token usage data for debugging
        console.log("AI SDK Response data:", {
          usage,
          finishReason,
          responseKeys: Object.keys(response),
        })

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
          assistantMessageId = await storeAssistantMessage({
            supabase,
            chatId,
            messages:
              response.messages as unknown as import("@/app/types/api.types").Message[],
            message_group_id,
            model,
            artifactParts,
          })

          // Record token usage if available
          if (usage && assistantMessageId) {
            try {
              const provider = getProviderForModel(model)
              const requestDuration = Date.now() - requestStartTime
              const streamingDuration = streamingStartTime
                ? Date.now() - streamingStartTime
                : undefined

              await recordTokenUsage(
                userId,
                chatId,
                assistantMessageId,
                provider,
                model,
                {
                  inputTokens: usage.promptTokens || 0,
                  outputTokens: usage.completionTokens || 0,
                  cachedTokens:
                    (usage as { cachedTokens?: number }).cachedTokens || 0, // Some providers return cached tokens
                  totalTokens:
                    usage.totalTokens ||
                    (usage.promptTokens || 0) + (usage.completionTokens || 0),
                  durationMs: requestDuration,
                  timeToFirstTokenMs: timeToFirstToken,
                  timeToFirstChunkMs: timeToFirstChunk,
                  streamingDurationMs: streamingDuration,
                }
              )

              console.log("Token usage recorded successfully:", {
                model,
                provider,
                inputTokens: usage.promptTokens,
                outputTokens: usage.completionTokens,
                cachedTokens: (usage as { cachedTokens?: number }).cachedTokens,
                duration: requestDuration,
                timeToFirstToken,
                timeToFirstChunk,
                streamingDuration,
              })
            } catch (tokenError) {
              console.error("Failed to record token usage:", tokenError)
              // Don't fail the request if token tracking fails
            }
          }
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
