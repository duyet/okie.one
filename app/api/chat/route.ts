// Attachment type removed in v5 - using file parts instead
import { streamText, type ToolSet, convertToCoreMessages } from "ai"
import type { UIMessage as MessageAISDK } from "@/lib/ai-sdk-types"

import { parseArtifacts } from "@/lib/artifacts/parser"
import { MAX_FILES_PER_MESSAGE, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import {
  getModelFileCapabilities,
  validateModelSupportsFiles,
} from "@/lib/file-handling"
import { apiLogger } from "@/lib/logger"
import { getMCPServer, hasMCPServer } from "@/lib/mcp/servers"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { recordTokenUsage } from "@/lib/token-tracking/api"
import type { ProviderWithoutOllama } from "@/lib/user-keys"

import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse } from "./utils"

export const maxDuration = 60

type ToolConfig = { type: "mcp"; name: string } | { type: "web_search" }

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  tools?: ToolConfig[]
  enableThink?: boolean // Native thinking capability - separate from tools
  // Legacy support - will be deprecated
  enableSearch?: boolean
  thinkingMode?: "none" | "regular" | "sequential"
  message_group_id?: string
}

export async function POST(req: Request) {
  const requestStartTime = Date.now()
  let assistantMessageId: string | null = null
  let timeToFirstChunk: number | undefined
  let streamingStartTime: number | undefined

  try {
    let requestBody: ChatRequest
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error("[/api/chat] JSON parse error:", parseError)
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
      })
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
      userMessage?.parts
        ?.filter((part) => (part as { type?: string }).type === "file")
        ?.map((part) => {
          const filePart = part as {
            name?: string
            mediaType?: string
            url?: string
            data?: string
          }
          return {
            name: filePart.name || "file",
            contentType: filePart.mediaType,
            url: filePart.url,
            content: filePart.data,
          }
        }) || []

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
            ?.filter((part) => (part as { type?: string }).type === "text")
            ?.map((part) => (part as { text?: string }).text)
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
    let enhancedSystemPrompt = effectiveSystemPrompt
    const enabledCapabilities = {
      webSearch: false,
      mcpSequentialThinking: false,
    }
    let _sequentialThinkingServer: {
      getTools: () => ToolSet
      getMaxSteps: () => number
    } | null = null

    apiLogger.info("Configuring tools", { tools: effectiveTools })

    // Process each tool configuration
    for (const tool of effectiveTools) {
      switch (tool.type) {
        case "web_search":
          enabledCapabilities.webSearch = true
          apiLogger.info("Web search enabled")
          break

        case "mcp": {
          const serverName = tool.name as string
          if (hasMCPServer(serverName)) {
            const mcpServer = getMCPServer(serverName)
            if (mcpServer) {
              if (serverName === "server-sequential-thinking") {
                enabledCapabilities.mcpSequentialThinking = true
                _sequentialThinkingServer = mcpServer
                apiLogger.info(
                  "MCP Sequential thinking enabled, adding tools from server"
                )

                // Add tools from the MCP server
                const serverTools = mcpServer.getTools()
                Object.assign(apiTools, serverTools)

                // Enhance system prompt with server's enhancement
                enhancedSystemPrompt = `${effectiveSystemPrompt}

${mcpServer.getSystemPromptEnhancement()}`
              }
            }
          } else {
            apiLogger.warn("MCP server requested but not implemented", {
              serverName: tool.name,
            })
          }
          break
        }

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

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, {
        enableSearch: enabledCapabilities.webSearch,
        enableThink:
          effectiveEnableThink || enabledCapabilities.mcpSequentialThinking,
      }),
      system: enhancedSystemPrompt,
      messages: convertToCoreMessages(messages),
      tools: apiTools,
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
              mcpSequentialThinkingEnabled:
                enabledCapabilities.mcpSequentialThinking,
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
                    (usage as any).promptTokens ||
                    (usage as any).inputTokens ||
                    0,
                  outputTokens:
                    (usage as any).completionTokens ||
                    (usage as any).outputTokens ||
                    0,
                  cachedTokens:
                    (usage as { cachedTokens?: number }).cachedTokens || 0, // Some providers return cached tokens
                  totalTokens:
                    usage.totalTokens ||
                    ((usage as any).promptTokens ||
                      (usage as any).inputTokens ||
                      0) +
                      ((usage as any).completionTokens ||
                        (usage as any).outputTokens ||
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
                (usage as any).promptTokens || (usage as any).inputTokens || 0,
                (usage as any).completionTokens ||
                  (usage as any).outputTokens ||
                  0,
                {
                  cachedTokens: (usage as { cachedTokens?: number })
                    .cachedTokens,
                  duration: requestDuration,
                  timeToFirstChunk,
                  streamingDuration,
                }
              )
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

    return (result as any).toDataStreamResponse?.({
      sendReasoning: true,
      sendSources: true,
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
