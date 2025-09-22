import type { UIMessage, Message } from "@/lib/ai-sdk-types"
import { useChat } from "@ai-sdk/react"
import { generateId } from "ai"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useChatDraft } from "@/app/hooks/use-chat-draft"
import type { ContentPart } from "@/app/types/api.types"
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import {
  parseArtifacts,
  replaceCodeBlocksWithArtifacts,
} from "@/lib/artifacts/parser"
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import type { Attachment } from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import type { MessagePart } from "@/lib/type-guards/message-parts"
import type { UserProfile } from "@/lib/user/types"

import type { ThinkingMode } from "../chat-input/button-think"
import { useArtifact } from "./artifact-context"

type UseChatCoreProps = {
  initialMessages: Message[]
  draftValue: string
  cacheAndAddMessage: (message: Message) => void
  chatId: string | null
  user: UserProfile | null
  files: File[]
  setFiles: (files: File[]) => void
  checkLimitsAndNotify: (uid: string) => Promise<boolean>
  ensureChatExists: (uid: string, input: string) => Promise<string | null>
  updateUrlForChat: (chatId: string) => void
  handleFileUploads: (
    uid: string,
    chatId: string
  ) => Promise<Attachment[] | null>
  selectedModel: string
  clearDraft: () => void
  bumpChat: (chatId: string) => void
  setHasActiveChatSession: (active: boolean) => void
}

export function useChatCore({
  initialMessages,
  draftValue,
  cacheAndAddMessage,
  chatId,
  user,
  files,
  setFiles,
  checkLimitsAndNotify,
  ensureChatExists,
  updateUrlForChat,
  handleFileUploads,
  selectedModel,
  clearDraft,
  bumpChat,
  setHasActiveChatSession,
}: UseChatCoreProps) {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("none")

  // State to track streaming tool invocations for the current message
  type StreamingToolInvocation = {
    toolCall?: {
      toolName?: string
      args?: Record<string, unknown>
    }
    toolName?: string
    args?: Record<string, unknown>
    result?: Record<string, unknown>
    [key: string]: unknown
  }

  const [streamingToolInvocations, setStreamingToolInvocations] = useState<
    Record<string, Array<StreamingToolInvocation>>
  >({})
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<
    string | null
  >(null)

  // Convert current state to unified tools format - memoized for performance
  const toolsConfig = useMemo(() => {
    const tools: Array<{ type: string; name?: string }> = []

    if (enableSearch) {
      tools.push({ type: "web_search" })
    }

    if (thinkingMode === "sequential") {
      tools.push({ type: "mcp", name: "server-sequential-thinking" })
    }

    return tools
  }, [enableSearch, thinkingMode])

  const getToolsConfig = useCallback(() => toolsConfig, [toolsConfig])

  // Refs and derived state
  const hasSentFirstMessageRef = useRef(false)
  const prevChatIdRef = useRef<string | null>(chatId)
  const isAuthenticated = useMemo(
    () => !!user?.id && !user?.anonymous,
    [user?.id, user?.anonymous]
  )
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Artifact context for auto-opening sidebar
  const { openArtifact } = useArtifact()

  // Search params handling
  const searchParams = useSearchParams()
  const prompt = searchParams.get("prompt")

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
    console.error("Chat error:", error)
    console.error("Error message:", error.message)
    let errorMsg = error.message || "Something went wrong."

    if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
      errorMsg = "Something went wrong. Please try again."
    }

    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  // Optimized LRU cache for storing processed messages
  const MAX_CACHE_SIZE = 100
  const processedMessagesCache = useRef<Map<string, Message>>(new Map())
  const cacheAccessOrder = useRef<string[]>([]) // Track access order for true LRU

  // Track artifacts that need to be opened - optimized to reduce re-renders
  const artifactsToOpenRef = useRef<ContentPart["artifact"][]>([])

  // Optimized artifact opening with ref to avoid re-render cycles
  const queueArtifactToOpen = useCallback(
    (artifact: ContentPart["artifact"]) => {
      artifactsToOpenRef.current = [artifact]
      // Use setTimeout to batch artifact opening and prevent render blocking
      setTimeout(() => {
        const artifacts = artifactsToOpenRef.current
        if (artifacts.length > 0) {
          const firstArtifact = artifacts[0]
          if (firstArtifact) {
            openArtifact(firstArtifact)
            artifactsToOpenRef.current = []
          }
        }
      }, 0)
    },
    [openArtifact]
  )

  // Real-time tool invocation processing during streaming
  const processStreamingToolInvocations = useCallback(
    (message: Message) => {
      if (message.role === "assistant") {
        // Check if message has toolInvocations property from AI SDK
        const messageWithToolInvocations = message as Message & {
          toolInvocations?: Array<{
            toolCall?: unknown
            [key: string]: unknown
          }>
        }

        // Get stored streaming tool invocations for this message
        // First check by actual message ID, then by streaming message ID
        let storedToolInvocations = streamingToolInvocations[message.id] || []

        // If no tool invocations found by message ID, check if this is the streaming message
        if (
          storedToolInvocations.length === 0 &&
          currentStreamingMessageId &&
          currentStreamingMessageId.startsWith("streaming-")
        ) {
          storedToolInvocations =
            streamingToolInvocations[currentStreamingMessageId] || []

          // Transfer tool invocations from streaming ID to actual message ID
          if (storedToolInvocations.length > 0) {
            setStreamingToolInvocations((prev) => {
              const newState = { ...prev }
              newState[message.id] = storedToolInvocations
              // Clean up the temporary streaming ID
              if (currentStreamingMessageId) {
                delete newState[currentStreamingMessageId]
              }
              return newState
            })
            setCurrentStreamingMessageId(null)
          }
        }

        const allToolInvocations = [
          ...(messageWithToolInvocations.toolInvocations || []),
          ...storedToolInvocations,
        ]

        if (allToolInvocations.length > 0) {
          console.log("🔧 Processing streaming tool invocations:", {
            messageId: message.id,
            toolInvocationsCount: allToolInvocations.length,
            toolInvocations: allToolInvocations,
          })

          // Extract reasoning steps from tool invocations
          const reasoningSteps = allToolInvocations
            .filter((ti) => {
              // Handle both direct tool invocations and tool call callbacks
              const toolName =
                (ti as { toolName?: string })?.toolName ||
                (ti.toolCall as { toolName?: string })?.toolName
              const args =
                (ti as { args?: Record<string, unknown> })?.args ||
                (ti.toolCall as { args?: Record<string, unknown> })?.args
              const result =
                (ti as { result?: Record<string, unknown> })?.result || args // Use args as result for streaming calls

              return (
                toolName === "addReasoningStep" &&
                result &&
                typeof result === "object" &&
                "title" in result &&
                "content" in result
              )
            })
            .map((ti) => {
              const args =
                (ti as { args?: Record<string, unknown> })?.args ||
                (ti.toolCall as { args?: Record<string, unknown> })?.args
              const result =
                (ti as { result?: Record<string, unknown> })?.result || args // Use args as result for streaming calls

              return {
                title: (result as { title?: string })?.title || "",
                content: (result as { content?: string })?.content || "",
                nextStep: (result as { nextStep?: string })?.nextStep,
              }
            })

          if (reasoningSteps.length > 0) {
            console.log(
              "🧠 Found reasoning steps from streaming tool invocations:",
              reasoningSteps
            )

            // Add reasoning steps to the message parts array for UI rendering
            const existingParts = message.parts || []
            const reasoningParts = reasoningSteps.map((step) => ({
              type: "sequential-reasoning-step" as const,
              step: step,
            }))

            // Create a new message with the reasoning parts added
            const updatedMessage = {
              ...message,
              parts: [
                ...existingParts.filter(
                  (p) =>
                    (p as { type?: string }).type !==
                    "sequential-reasoning-step"
                ),
                ...reasoningParts,
              ],
            }

            return updatedMessage as Message
          }
        }
      }
      return message
    },
    [streamingToolInvocations, currentStreamingMessageId]
  )

  // Utility function to generate stable cache key for messages
  const generateContentCacheKey = useCallback(
    (messageId: string, content: string): string => {
      const contentHash = content.split("").reduce((acc, char, idx) => {
        return acc + char.charCodeAt(0) * (idx + 1)
      }, 0)
      return `${messageId}-${contentHash}`
    },
    []
  )

  // Utility function to handle early artifact detection and sidebar opening
  const handleEarlyArtifactDetection = useCallback(
    (content: string) => {
      const hasCodeBlockStart = content.includes("```")
      const hasLargeCode = content.length > 300

      if (hasCodeBlockStart && hasLargeCode) {
        const earlyArtifacts = parseArtifacts(content, true)
        if (earlyArtifacts.length > 0) {
          const firstArtifact = earlyArtifacts[0]?.artifact
          if (firstArtifact) {
            console.log(
              "🚀 Early artifact detection - opening sidebar:",
              firstArtifact.title
            )
            queueArtifactToOpen(firstArtifact)
          }
        }
      }
    },
    [queueArtifactToOpen]
  )

  // Utility function to process artifacts and update message content
  const processArtifactsAndUpdateContent = useCallback(
    (message: Message, artifactParts: ContentPart[]): Message => {
      console.log(
        "🎨 Real-time artifact detected during streaming:",
        artifactParts.map(
          (p) => `${p.artifact?.title} (${p.artifact?.metadata.lines} lines)`
        )
      )

      // Auto-open the first artifact in the sidebar during streaming
      const firstArtifact = artifactParts[0]?.artifact
      if (firstArtifact) {
        console.log("📌 Auto-opening artifact in sidebar:", firstArtifact.title)
        queueArtifactToOpen(firstArtifact)
      }

      // Extract text content from parts for v5 message structure
      const textContent = (message.parts || [])
        .filter((part) => (part as { type?: string }).type === "text")
        .map((part) => (part as { text?: string }).text)
        .join("")

      const updatedTextContent = replaceCodeBlocksWithArtifacts(
        textContent,
        artifactParts
      )

      // Create updated text parts
      const updatedTextParts = [{ type: "text", text: updatedTextContent }]
      const nonTextParts = (message.parts || []).filter(
        (part) =>
          part.type !== "text" && (part as MessagePart).type !== "artifact"
      )

      return {
        ...message,
        parts: [...updatedTextParts, ...nonTextParts, ...artifactParts],
      } as Message
    },
    [queueArtifactToOpen]
  )

  // Utility function to handle LRU cache eviction and storage
  // Optimized LRU cache management
  const updateMessageCache = useCallback(
    (cacheKey: string, message: Message) => {
      const cache = processedMessagesCache.current
      const accessOrder = cacheAccessOrder.current

      // Remove key from access order if it exists
      const existingIndex = accessOrder.indexOf(cacheKey)
      if (existingIndex > -1) {
        accessOrder.splice(existingIndex, 1)
      }

      // Add to end (most recently used)
      accessOrder.push(cacheKey)

      // Evict least recently used items if cache is full
      while (cache.size >= MAX_CACHE_SIZE && accessOrder.length > 0) {
        const lruKey = accessOrder.shift()
        if (lruKey) {
          cache.delete(lruKey)
        }
      }

      cache.set(cacheKey, message)
    },
    []
  )

  const getCachedMessage = useCallback((cacheKey: string): Message | null => {
    const cache = processedMessagesCache.current
    const accessOrder = cacheAccessOrder.current

    if (!cache.has(cacheKey)) {
      return null
    }

    // Update access order - move to end (most recently used)
    const existingIndex = accessOrder.indexOf(cacheKey)
    if (existingIndex > -1) {
      accessOrder.splice(existingIndex, 1)
    }
    accessOrder.push(cacheKey)

    return cache.get(cacheKey) || null
  }, [])

  // Real-time artifact processing during streaming with improved caching
  const processStreamingArtifacts = useCallback(
    (message: Message) => {
      if (message.role === "assistant" && message.parts) {
        // Extract text content from parts
        const textContent = message.parts
          .filter((part) => (part as { type?: string }).type === "text")
          .map((part) => (part as { text?: string }).text)
          .join("")

        // Skip processing very short content
        if (textContent.length < 10) {
          return message
        }

        // Generate stable cache key
        const cacheKey = generateContentCacheKey(message.id, textContent)

        // Return cached processed message if it exists
        const cachedMessage = getCachedMessage(cacheKey)
        if (cachedMessage) {
          return cachedMessage
        }

        // Handle early artifact detection
        handleEarlyArtifactDetection(textContent)

        // Parse artifacts from the current content during streaming
        const artifactParts = parseArtifacts(textContent, true)

        if (artifactParts.length > 0) {
          const updatedMessage = processArtifactsAndUpdateContent(
            message,
            artifactParts
          )

          console.log("🔧 processStreamingArtifacts result:", {
            messageId: message.id,
            originalLength: textContent.length,
            textPartsCount: message.parts.filter(
              (p) => (p as { type?: string }).type === "text"
            ).length,
            hasMarkers: updatedMessage.parts
              ?.filter((p) => (p as { type?: string }).type === "text")
              .some(
                (p) =>
                  (p as { text?: string }).text?.includes(
                    "[ARTIFACT_PREVIEW:"
                  ) || false
              ),
            artifactCount: artifactParts.length,
            cacheKey,
          })

          // Store the processed message in cache
          updateMessageCache(cacheKey, updatedMessage as Message)
          return updatedMessage as Message
        }
      }
      return message
    },
    [
      generateContentCacheKey,
      handleEarlyArtifactDetection,
      processArtifactsAndUpdateContent,
      updateMessageCache,
      getCachedMessage,
    ]
  )

  // For new chats (chatId is null), use empty messages to avoid conflicts
  // For existing chats (chatId exists), use initialMessages from the provider
  // Filter out "data" role messages and convert to UIMessage format
  const effectiveInitialMessages = useMemo(
    () =>
      chatId
        ? (initialMessages
            .filter((m) => m.role !== "data")
            .map((m) => ({
              ...m,
              role: m.role as "system" | "user" | "assistant",
            })) as UIMessage[])
        : [],
    [chatId, initialMessages]
  )

  // Initialize useChat with v5 transport
  const [input, setInput] = useState(draftValue)
  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    stop,
    setMessages,
  } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages: effectiveInitialMessages,
    body: ({ messages }: { messages: UIMessage[] }) => {
      return {
        messages,
        chatId: chatId || "",
        userId: user?.id || "",
        model: selectedModel,
        isAuthenticated: !!(user?.id && !user?.anonymous),
        systemPrompt: user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
        tools: toolsConfig,
        enableSearch,
        enableThink: thinkingMode === "regular",
        thinkingMode,
      }
    },
    onFinish: (options: any) => {
      console.log("🔍 useChat onFinish:", options.message)
      // Message already processed by streaming, just cache it
      const messageWithContent: Message = {
        ...options.message,
        content:
          options.message.parts
            ?.filter((p: any) => p.type === "text")
            ?.map((p: any) => p.text)
            ?.join("") || "",
      } as Message
      cacheAndAddMessage(messageWithContent)
    },
    onError: handleError,
    // Add tool invocation callbacks for streaming
    onToolCall: (toolCall: StreamingToolInvocation) => {
      console.log("🔧 Tool call during streaming:", toolCall)

      // Create a temporary message ID for streaming if no current message exists
      let messageId: string

      // Find the current assistant message (last message with assistant role)
      const currentMessage = messages.findLast(
        (msg) => msg.role === "assistant"
      )

      if (currentMessage) {
        messageId = currentMessage.id
        console.log(
          "🔧 Associating tool call with existing message:",
          messageId
        )
      } else {
        // Create a temporary streaming message ID if no current message exists
        messageId = currentStreamingMessageId || `streaming-${Date.now()}`
        if (!currentStreamingMessageId) {
          setCurrentStreamingMessageId(messageId)
        }
        console.log(
          "🔧 Associating tool call with streaming message:",
          messageId
        )
      }

      // Store tool invocation by message ID
      setStreamingToolInvocations((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), toolCall],
      }))
    },
  } as any)

  // Create handleSubmit and append functions for v5 compatibility
  const handleSubmit = useCallback(
    (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.()
      if (input.trim()) {
        // Note: submit function will be available at runtime due to hoisting
        // We call it directly without including it in dependencies to avoid
        // the "used before declaration" lint error
        submit()
      }
    },
    [input]
  )

  // sendMessage and regenerate are provided by useChat above

  // Process both artifacts and tool invocations in streaming messages (after useChat initialization)
  const processedMessages = useMemo(() => {
    console.log("🔍 useChatCore - processing messages:", {
      rawMessagesCount: messages?.length || 0,
      rawMessages:
        messages?.map((m) => ({
          id: m.id,
          role: m.role,
          content: (() => {
            const textContent =
              m.parts
                ?.filter((p) => (p as { type?: string }).type === "text")
                ?.map((p) => (p as { text?: string }).text)
                ?.join("") || ""
            return `${textContent.substring(0, 50)}...`
          })(),
        })) || [],
      status,
    })

    if (!messages?.length) return []
    const processed = messages.map((message) => {
      // Convert UIMessage to Message with content field
      const messageWithContent: Message = {
        ...message,
        content:
          message.parts
            ?.filter((p) => (p as { type?: string }).type === "text")
            ?.map((p) => (p as { text?: string }).text)
            ?.join("") || "",
      } as Message
      // Apply both processing functions in sequence
      const withToolInvocations =
        processStreamingToolInvocations(messageWithContent)
      const withArtifacts = processStreamingArtifacts(withToolInvocations)
      return withArtifacts
    })

    console.log("🔍 useChatCore - processed messages:", {
      processedCount: processed.length,
      processedMessages: processed.map((m) => ({
        id: m.id,
        role: m.role,
        content: (() => {
          const textContent =
            m.parts
              ?.filter((p) => (p as { type?: string }).type === "text")
              ?.map((p) => (p as { text?: string }).text)
              ?.join("") || ""
          return `${textContent.substring(0, 50)}...`
        })(),
      })),
    })

    return processed
  }, [
    messages,
    processStreamingArtifacts,
    processStreamingToolInvocations,
    status,
  ])

  // Track raw messages changes for debugging
  useEffect(() => {
    console.log("🔍 Raw messages changed:", {
      count: messages?.length || 0,
      status,
      lastMessage: (() => {
        const lastMsg = messages?.[messages.length - 1]
        if (!lastMsg) return "none"
        const textContent =
          lastMsg.parts
            ?.filter((p) => (p as { type?: string }).type === "text")
            ?.map((p) => (p as { text?: string }).text)
            ?.join("") || ""
        return `${textContent.substring(0, 50)}...`
      })(),
    })
  }, [messages, status])

  // Track initialMessages changes for debugging
  useEffect(() => {
    console.log("🔍 initialMessages changed:", {
      count: initialMessages?.length || 0,
      initialMessages:
        initialMessages?.map((m) => ({
          id: m.id,
          role: m.role,
          content: (() => {
            const textContent =
              m.parts
                ?.filter((p) => (p as { type?: string }).type === "text")
                ?.map((p) => (p as { text?: string }).text)
                ?.join("") || ""
            return `${textContent.substring(0, 30)}...`
          })(),
        })) || [],
    })
  }, [initialMessages])

  // Signal when we have an active chat session
  useEffect(() => {
    // Set active when we're streaming or have messages
    const hasActiveSession =
      status === "streaming" ||
      status === "submitted" ||
      (messages.length > 0 && !chatId)
    setHasActiveChatSession(hasActiveSession)

    // Clean up when component unmounts
    return () => setHasActiveChatSession(false)
  }, [status, messages.length, chatId, setHasActiveChatSession])

  // Handle search params on mount
  useEffect(() => {
    if (prompt && typeof window !== "undefined") {
      requestAnimationFrame(() => setInput(prompt))
    }
  }, [prompt])

  // Cleanup cache on unmount to prevent memory leaks
  useEffect(() => {
    // Copy ref to a local variable to avoid stale closure warning
    const cacheRef = processedMessagesCache.current
    return () => {
      cacheRef.clear()
    }
  }, [])

  // Reset messages when navigating from a chat to home
  // But only if we're not in the middle of streaming
  useEffect(() => {
    if (
      prevChatIdRef.current !== null &&
      chatId === null &&
      messages.length > 0 &&
      status === "ready"
    ) {
      setMessages([])
      hasSentFirstMessageRef.current = false // Reset for new session
    }
    prevChatIdRef.current = chatId
  }, [chatId, messages.length, status, setMessages])

  // Submit action
  const submit = useCallback(async () => {
    console.log("🔍 Submit called - initial state:", {
      inputLength: input.length,
      messagesCount: messages.length,
      status,
    })

    // Prevent double submission
    if (isSubmitting) {
      console.warn("🚨 Submit already in progress, ignoring duplicate call")
      return
    }

    setIsSubmitting(true)

    // Clear streaming tool invocations for new submission
    setStreamingToolInvocations({})
    setCurrentStreamingMessageId(null)

    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      setIsSubmitting(false)
      return
    }

    // Let AI SDK handle optimistic updates automatically
    // const optimisticId = `optimistic-${Date.now().toString()}`
    // const optimisticAttachments =
    //   files.length > 0 ? createOptimisticAttachments(files) : []

    // const optimisticMessage = {
    //   id: optimisticId,
    //   content: input,
    //   role: "user" as const,
    //   createdAt: new Date(),
    //   experimental_attachments:
    //     optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
    // }

    // setMessages((prev) => [...prev, optimisticMessage])
    setInput("")

    const submittedFiles = [...files]
    setFiles([])

    try {
      // Add timeout for critical async operations
      const ASYNC_TIMEOUT = 15000 // 15 second timeout for individual operations

      const allowed = await Promise.race([
        checkLimitsAndNotify(uid),
        new Promise<boolean>((_, reject) =>
          setTimeout(
            () => reject(new Error("Rate limit check timeout")),
            ASYNC_TIMEOUT
          )
        ),
      ])
      if (!allowed) {
        setIsSubmitting(false)
        return
      }

      const currentChatId = await Promise.race([
        ensureChatExists(uid, input),
        new Promise<string | null>((_, reject) =>
          setTimeout(
            () => reject(new Error("Chat creation timeout")),
            ASYNC_TIMEOUT
          )
        ),
      ])
      if (!currentChatId) {
        setIsSubmitting(false)
        return
      }

      if (input.length > MESSAGE_MAX_LENGTH) {
        toast({
          title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
          status: "error",
        })
        setIsSubmitting(false)
        return
      }

      let attachments: Attachment[] | null = []
      if (submittedFiles.length > 0) {
        attachments = await Promise.race([
          handleFileUploads(uid, currentChatId),
          new Promise<null>(
            (_, reject) =>
              setTimeout(
                () => reject(new Error("File upload timeout")),
                ASYNC_TIMEOUT * 2
              ) // Longer timeout for file uploads
          ),
        ])
        if (attachments === null) {
          setIsSubmitting(false)
          return
        }
      }

      const options = {
        body: {
          chatId: currentChatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated,
          systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
          tools: getToolsConfig(),
          // Legacy support for backward compatibility
          enableSearch,
          enableThink: thinkingMode === "regular",
          thinkingMode,
        },
        experimental_attachments: attachments || undefined,
      }

      console.log("🔍 About to call sendMessage with options:", options)
      hasSentFirstMessageRef.current = true // Mark that we've sent a message

      // AI SDK v5: Send message with body options
      sendMessage({ text: input }, options)
      setInput("")
      console.log("🔍 sendMessage call completed")

      // Update URL without reload (if we're not already there)
      if (!chatId) {
        console.log("🔍 Updating URL for chat without reload:", currentChatId)
        updateUrlForChat(currentChatId)
      }

      clearDraft()

      if (messages.length > 0) {
        bumpChat(currentChatId)
      }
    } catch (error) {
      console.error("🚨 Submit failed:", error)

      // Provide specific error messages based on error type
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message"
      let toastTitle = "Failed to send message"

      if (errorMessage.includes("timeout")) {
        toastTitle = "Request timed out - please try again"
      } else if (errorMessage.includes("Rate limit")) {
        toastTitle = "Rate limit exceeded"
      } else if (errorMessage.includes("Chat creation")) {
        toastTitle = "Failed to create chat"
      } else if (errorMessage.includes("File upload")) {
        toastTitle = "File upload failed"
      }

      toast({ title: toastTitle, status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    user,
    files,
    input,
    setFiles,
    checkLimitsAndNotify,
    ensureChatExists,
    updateUrlForChat,
    handleFileUploads,
    selectedModel,
    isAuthenticated,
    systemPrompt,
    enableSearch,
    thinkingMode,
    getToolsConfig,
    handleSubmit,
    clearDraft,
    messages.length,
    bumpChat,
    chatId,
    status,
    isSubmitting,
  ])

  // Handle suggestion
  const handleSuggestion = useCallback(
    async (suggestion: string) => {
      setIsSubmitting(true)

      try {
        const uid = await getOrCreateGuestUserId(user)

        if (!uid) {
          setIsSubmitting(false)
          return
        }

        const allowed = await checkLimitsAndNotify(uid)
        if (!allowed) {
          setIsSubmitting(false)
          return
        }

        const currentChatId = await ensureChatExists(uid, suggestion)

        if (!currentChatId) {
          setIsSubmitting(false)
          return
        }

        // Options are now handled internally by the transport
        sendMessage({
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: suggestion }],
        })
      } catch {
        toast({ title: "Failed to send suggestion", status: "error" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [ensureChatExists, user, sendMessage, checkLimitsAndNotify]
  )

  // Handle reload
  const handleReload = useCallback(async () => {
    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      return
    }

    // Options are now handled internally by the transport
    regenerate()
  }, [user, regenerate])

  // Handle input change - now with access to the real setInput function!
  const { setDraftValue } = useChatDraft(chatId)
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setDraftValue]
  )

  return {
    // Chat state
    messages: processedMessages,
    input,
    handleSubmit,
    status,
    error,
    reload: regenerate,
    stop,
    setMessages,
    setInput,
    append: sendMessage,
    isAuthenticated,
    systemPrompt,
    hasSentFirstMessageRef,

    // Component state
    isSubmitting,
    setIsSubmitting,
    hasDialogAuth,
    setHasDialogAuth,
    enableSearch,
    setEnableSearch,
    thinkingMode,
    setThinkingMode,

    // Actions
    submit,
    handleSuggestion,
    handleReload,
    handleInputChange,
  }
}
