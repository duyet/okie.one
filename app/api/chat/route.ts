// AI SDK v5 - State-of-the-art streaming chat implementation
import {
  convertToModelMessages,
  streamText,
  type ToolSet,
} from "ai"

import { parseArtifacts } from "@/lib/artifacts/parser"
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  SYSTEM_PROMPT_DEFAULT,
} from "@/lib/config"
import { trackMessageSent } from "@/lib/event-tracking/api"
import {
  getModelFileCapabilities,
  validateModelSupportsFiles,
} from "@/lib/file-handling"
import { apiLogger } from "@/lib/logger"
import type { MessagePart } from "@/lib/type-guards/message-parts"
import { getAllModels } from "@/lib/models"
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/ratelimit"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { recordTokenUsage } from "@/lib/token-tracking/api"
import { ChatRequestSchema, type ChatRequest } from "@/lib/api-validation"
import type { ProviderWithoutOllama } from "@/lib/user-keys"

// Extended usage type to handle different provider formats
type ExtendedUsage = {
  totalTokens?: number
  inputTokens?: number
  outputTokens?: number
  promptTokens?: number
  completionTokens?: number
  cachedTokens?: number
}

// AI SDK v5 - Simplified types, leveraging built-in UIMessage format

import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse } from "./utils"

export const maxDuration = 60

type ToolConfig = { type: "mcp"; name: string } | { type: "web_search" }

export async function POST(req: Request) {
  // Rate limiting check
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous"
  const { allowed, resetIn } = checkRateLimit(`chat:${ip}`)

  if (!allowed) {
    apiLogger.warn("Rate limit exceeded for chat endpoint", { ip, resetIn })
    return rateLimitResponse(resetIn ?? 10)
  }

  const requestStartTime = Date.now()
  let assistantMessageId: string | null = null
  let timeToFirstChunk: number | undefined
  let streamingStartTime: number | undefined

  try {
    let requestBody: ChatRequest
    try {
      requestBody = ChatRequestSchema.parse(await req.json())
    } catch (validationError) {
      apiLogger.warn("Request validation failed", { error: validationError })
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details:
            validationError instanceof Error
              ? validationError.message
              : "Invalid input",
        }),
        { status: 400 }
      )
    }

    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      tools,
      // Legacy support
      enableSearch,
      enableThink,
      thinkingMode = "none",
      message_group_id,
    } = requestBody

    // Convert legacy flags to new tools format for backward compatibility
    const effectiveTools: ToolConfig[] = tools || []
    const effectiveEnableThink = enableThink || thinkingMode === "regular"

    if (!tools) {
      // Legacy mode - convert old flags to new tools format
      if (enableSearch) {
        effectiveTools.push({ type: "web_search" })
      }
      if (thinkingMode === "sequential") {
        effectiveTools.push({ type: "mcp", name: "server-sequential-thinking" })
      }
    }

    apiLogger.chatRequest(model, messages?.length || 0, {
      tools: effectiveTools,
      enableThink: effectiveEnableThink,
      thinkingMode,
    })

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
    const rawAttachments =
      userMessage?.parts
        ?.filter((part: MessagePart) => (part as { type?: string }).type === "file")
        ?.map((part: MessagePart) => {
          const filePart = part as {
            name?: string
            mediaType?: string
            url?: string
            data?: string
          }
          return {
            name: filePart.name || "file",
            contentType: filePart.mediaType || "application/octet-stream",
            url: filePart.url || "",
            content: filePart.data || "",
          }
        }) || []

    // Validate file attachments for security
    const validatedAttachments = rawAttachments.filter((attachment: {
      name: string
      contentType: string
      url: string
      content: string
    }) => {
      // Validate file type
      if (!attachment.contentType || !ALLOWED_FILE_TYPES.includes(attachment.contentType)) {
        apiLogger.warn("Invalid file type rejected", {
          contentType: attachment.contentType,
          fileName: attachment.name,
        })
        return false
      }

      // Validate file size from base64
      if (attachment.content) {
        try {
          const sizeInBytes = Buffer.byteLength(attachment.content, "base64")
          if (sizeInBytes > MAX_FILE_SIZE) {
            apiLogger.warn("File size exceeds limit", {
              size: sizeInBytes,
              maxSize: MAX_FILE_SIZE,
              fileName: attachment.name,
            })
            return false
          }
        } catch (error) {
          apiLogger.error("Failed to validate file size", {
            error,
            fileName: attachment.name,
          })
          return false
        }
      }

      // Validate base64 format (strict check to prevent injection attacks)
      // Only accepts standard base64 charset with optional padding
      if (attachment.content && !/^[A-Za-z0-9+/]+=*$/.test(attachment.content)) {
        apiLogger.warn("Malformed base64 data rejected", {
          fileName: attachment.name,
        })
        return false
      }

      return true
    })

    const attachments = validatedAttachments

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
        content:
          userMessage.parts
            ?.filter((part: MessagePart) => (part as { type?: string }).type === "text")
            ?.map((part: MessagePart) => (part as { text?: string }).text)
            ?.join("\n") || "",
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

    // Configure tools based on unified tools configuration
    const apiTools: ToolSet = {}
    const enhancedSystemPrompt = effectiveSystemPrompt
    const enabledCapabilities = {
      webSearch: false,
    }

    apiLogger.info("Configuring tools", { tools: effectiveTools })

    // Process each tool configuration
    for (const tool of effectiveTools) {
      switch (tool.type) {
        case "web_search":
          enabledCapabilities.webSearch = true
          apiLogger.info("Web search enabled")
          break

        default:
          apiLogger.warn("Unknown tool type encountered", {
            toolType:
              typeof tool === "object" &&
              tool !== null &&
              "type" in tool &&
              typeof (tool as { type: unknown }).type === "string"
                ? (tool as { type: string }).type
                : "unknown",
            tool,
          })
      }
    }

    // AI SDK v5 - State-of-the-art streaming implementation
    const result = streamText({
      model: modelConfig.apiSdk(apiKey, {
        enableSearch: enabledCapabilities.webSearch,
        enableThink: effectiveEnableThink,
      }),
      system: enhancedSystemPrompt,
      messages: await convertToModelMessages(messages),
      tools: apiTools,
      maxOutputTokens: 8192, // Modern token limit for better responses
      onError: (err: unknown) => {
        apiLogger.error("Streaming error occurred", { error: err })

        if (err instanceof Error) {
          apiLogger.error("Error details", {
            message: err.message,
            stack: err.stack,
          })

          // Log additional context for tool-related errors
          if (
            err.message.includes("tool_calls") ||
            err.message.includes("function.arguments")
          ) {
            apiLogger.error("Tool call error detected", {
              toolsEnabled: Object.keys(apiTools),
              messagesCount: messages?.length,
              lastFewMessages: messages?.slice(-3),
            })
          }
        }

        // Don't set streamError anymore - let the AI SDK handle it through the stream
      },
      onChunk: () => {
        // Set timeToFirstChunk and streamingStartTime only once, on the first chunk
        if (timeToFirstChunk === undefined) {
          timeToFirstChunk = Date.now() - requestStartTime
          streamingStartTime = Date.now()
        }
      },

      onFinish: async ({ response, usage, finishReason }) => {
        // Log token usage data for debugging
        apiLogger.info("AI SDK Response data", {
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
        apiLogger.info("Parsed artifacts", {
          artifactCount: artifactParts.length,
          responseLength: responseText.length,
        })

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
                  inputTokens:
                    (usage as ExtendedUsage).promptTokens ||
                    (usage as ExtendedUsage).inputTokens ||
                    0,
                  outputTokens:
                    (usage as ExtendedUsage).completionTokens ||
                    (usage as ExtendedUsage).outputTokens ||
                    0,
                  cachedTokens: (usage as ExtendedUsage).cachedTokens || 0, // Some providers return cached tokens
                  totalTokens:
                    usage.totalTokens ||
                    ((usage as ExtendedUsage).promptTokens ||
                      (usage as ExtendedUsage).inputTokens ||
                      0) +
                      ((usage as ExtendedUsage).completionTokens ||
                        (usage as ExtendedUsage).outputTokens ||
                        0),
                  durationMs: requestDuration,
                  timeToFirstTokenMs: timeToFirstChunk, // Using first chunk as proxy for first token
                  timeToFirstChunkMs: timeToFirstChunk,
                  streamingDurationMs: streamingDuration,
                }
              )

              apiLogger.tokenUsage(
                model,
                provider,
                (usage as ExtendedUsage).promptTokens ||
                  (usage as ExtendedUsage).inputTokens ||
                  0,
                (usage as ExtendedUsage).completionTokens ||
                  (usage as ExtendedUsage).outputTokens ||
                  0,
                {
                  cachedTokens: (usage as ExtendedUsage).cachedTokens,
                  duration: requestDuration,
                  timeToFirstChunk,
                  streamingDuration,
                }
              )

              // Track message event for analytics
              try {
                await trackMessageSent(userId, chatId, model, usage.totalTokens)
              } catch (trackError) {
                // Don't fail the request if event tracking fails
                apiLogger.error("Failed to track message event", {
                  error: trackError,
                })
              }
            } catch (tokenError) {
              apiLogger.error("Failed to record token usage", {
                error: tokenError,
              })
              // Don't fail the request if token tracking fails
            }
          }
        }
      },
    })

    // AI SDK v5 - Modern streaming response with enhanced features
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: finishedMessages }) => {
        // Enhanced message persistence with proper AI SDK v5 format
        if (supabase) {
          try {
            const finalMessage = finishedMessages[finishedMessages.length - 1]
            if (finalMessage?.role === "assistant") {
              await storeAssistantMessage({
                supabase,
                chatId,
                messages:
                  finishedMessages as unknown as import("@/app/types/api.types").Message[],
                message_group_id,
                model,
                artifactParts: [], // Will be processed separately if needed
              })
            }
          } catch (error) {
            apiLogger.error("Failed to store assistant message", { error })
          }
        }
      },
    })
  } catch (err: unknown) {
    apiLogger.error("Error in /api/chat", { error: err })
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
