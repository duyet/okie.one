import type { Message } from "@ai-sdk/react"
import { useChat } from "@ai-sdk/react"
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
  const [streamingToolInvocations, setStreamingToolInvocations] = useState<
    Record<string, Array<{ toolCall?: unknown; [key: string]: unknown }>>
  >({})
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<
    string | null
  >(null)

  // Convert current state to unified tools format
  const getToolsConfig = useCallback(() => {
    const tools: Array<{ type: string; name?: string }> = []

    if (enableSearch) {
      tools.push({ type: "web_search" })
    }

    if (thinkingMode === "sequential") {
      tools.push({ type: "mcp", name: "server-sequential-thinking" })
    }

    return tools
  }, [enableSearch, thinkingMode])

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

  // Cache for storing processed messages to prevent infinite processing and ensure consistency
  // Implement LRU cache with max size to prevent memory leaks
  const MAX_CACHE_SIZE = 100
  const processedMessagesCache = useRef<Map<string, Message>>(new Map())

  // Track artifacts that need to be opened
  const [artifactsToOpen, setArtifactsToOpen] = useState<
    ContentPart["artifact"][]
  >([])

  // Open artifacts outside of render
  useEffect(() => {
    if (artifactsToOpen.length > 0) {
      const firstArtifact = artifactsToOpen[0]
      if (firstArtifact) {
        openArtifact(firstArtifact)
        setArtifactsToOpen([])
      }
    }
  }, [artifactsToOpen, openArtifact])

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
  const handleEarlyArtifactDetection = useCallback((content: string) => {
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
          setArtifactsToOpen([firstArtifact])
        }
      }
    }
  }, [])

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
        setArtifactsToOpen([firstArtifact])
      }

      // Replace inline code blocks with artifact placeholders in the content
      const updatedContent = replaceCodeBlocksWithArtifacts(
        message.content as string,
        artifactParts
      )

      // Replace any existing artifact parts with new ones
      const nonArtifactParts = (message.parts || []).filter(
        (part) => (part as MessagePart).type !== "artifact"
      )

      return {
        ...message,
        content: updatedContent,
        parts: [...nonArtifactParts, ...artifactParts],
      } as Message
    },
    []
  )

  // Utility function to handle LRU cache eviction and storage
  const updateMessageCache = useCallback(
    (cacheKey: string, message: Message) => {
      // Implement LRU eviction when cache exceeds max size
      if (processedMessagesCache.current.size >= MAX_CACHE_SIZE) {
        const firstKey = processedMessagesCache.current.keys().next().value
        if (firstKey) {
          processedMessagesCache.current.delete(firstKey)
        }
      }
      processedMessagesCache.current.set(cacheKey, message)
    },
    []
  )

  // Real-time artifact processing during streaming with improved caching
  const processStreamingArtifacts = useCallback(
    (message: Message) => {
      if (message.role === "assistant" && typeof message.content === "string") {
        // Skip processing very short content
        if (message.content.length < 10) {
          return message
        }

        // Generate stable cache key
        const cacheKey = generateContentCacheKey(message.id, message.content)

        // Return cached processed message if it exists
        if (processedMessagesCache.current.has(cacheKey)) {
          const cachedMessage = processedMessagesCache.current.get(cacheKey)
          if (cachedMessage) {
            return cachedMessage
          }
        }

        // Handle early artifact detection
        handleEarlyArtifactDetection(message.content)

        // Parse artifacts from the current content during streaming
        const artifactParts = parseArtifacts(message.content, true)

        if (artifactParts.length > 0) {
          const updatedMessage = processArtifactsAndUpdateContent(
            message,
            artifactParts
          )

          console.log("🔧 processStreamingArtifacts result:", {
            messageId: message.id,
            originalLength: message.content.length,
            updatedLength: (updatedMessage.content as string).length,
            hasMarkers: (updatedMessage.content as string).includes(
              "[ARTIFACT_PREVIEW:"
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
    ]
  )

  // For new chats (chatId is null), use empty messages to avoid conflicts
  // For existing chats (chatId exists), use initialMessages from the provider
  const effectiveInitialMessages = chatId ? initialMessages : []

  // Initialize useChat
  const {
    messages,
    input,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setMessages,
    setInput,
    append,
  } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages: effectiveInitialMessages,
    initialInput: draftValue,
    onFinish: (message) => {
      console.log("🔍 useChat onFinish:", message)
      // Message already processed by streaming, just cache it
      cacheAndAddMessage(message)
    },
    onError: handleError,
    // Add debugging for streaming status
    onResponse: (response) => {
      console.log("🔍 useChat onResponse - streaming started:", {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      })
    },
    // Add tool invocation callbacks for streaming
    onToolCall: (toolCall) => {
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
  })

  // Process both artifacts and tool invocations in streaming messages (after useChat initialization)
  const processedMessages = useMemo(() => {
    console.log("🔍 useChatCore - processing messages:", {
      rawMessagesCount: messages?.length || 0,
      rawMessages:
        messages?.map((m) => ({
          id: m.id,
          role: m.role,
          content:
            typeof m.content === "string"
              ? `${m.content.substring(0, 50)}...`
              : m.content,
        })) || [],
      status,
    })

    if (!messages?.length) return []
    const processed = messages.map((message) => {
      // Apply both processing functions in sequence
      const withToolInvocations = processStreamingToolInvocations(message)
      const withArtifacts = processStreamingArtifacts(withToolInvocations)
      return withArtifacts
    })

    console.log("🔍 useChatCore - processed messages:", {
      processedCount: processed.length,
      processedMessages: processed.map((m) => ({
        id: m.id,
        role: m.role,
        content:
          typeof m.content === "string"
            ? `${m.content.substring(0, 50)}...`
            : m.content,
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
      lastMessage: messages?.[messages.length - 1]?.content || "none",
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
          content:
            typeof m.content === "string"
              ? `${m.content.substring(0, 30)}...`
              : m.content,
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
  }, [prompt, setInput])

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
      const allowed = await checkLimitsAndNotify(uid)
      if (!allowed) {
        setIsSubmitting(false)
        return
      }

      const currentChatId = await ensureChatExists(uid, input)
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
        attachments = await handleFileUploads(uid, currentChatId)
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

      console.log("🔍 About to call handleSubmit with options:", options)
      hasSentFirstMessageRef.current = true // Mark that we've sent a message

      // Start streaming first
      handleSubmit(undefined, options)
      console.log("🔍 handleSubmit call completed")

      // Update URL without reload (if we're not already there)
      if (!chatId) {
        console.log("🔍 Updating URL for chat without reload:", currentChatId)
        updateUrlForChat(currentChatId)
      }

      clearDraft()

      if (messages.length > 0) {
        bumpChat(currentChatId)
      }
    } catch {
      toast({ title: "Failed to send message", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    user,
    files,
    input,
    setInput,
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

        const options = {
          body: {
            chatId: currentChatId,
            userId: uid,
            model: selectedModel,
            isAuthenticated,
            systemPrompt: SYSTEM_PROMPT_DEFAULT,
          },
        }

        append(
          {
            role: "user",
            content: suggestion,
          },
          options
        )
      } catch {
        toast({ title: "Failed to send suggestion", status: "error" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      ensureChatExists,
      selectedModel,
      user,
      append,
      checkLimitsAndNotify,
      isAuthenticated,
    ]
  )

  // Handle reload
  const handleReload = useCallback(async () => {
    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      return
    }

    const options = {
      body: {
        chatId,
        userId: uid,
        model: selectedModel,
        isAuthenticated,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        tools: getToolsConfig(),
        // Legacy support for backward compatibility
        enableThink: thinkingMode === "regular",
        thinkingMode,
      },
    }

    reload(options)
  }, [
    user,
    chatId,
    selectedModel,
    isAuthenticated,
    systemPrompt,
    thinkingMode,
    getToolsConfig,
    reload,
  ])

  // Handle input change - now with access to the real setInput function!
  const { setDraftValue } = useChatDraft(chatId)
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setInput, setDraftValue]
  )

  return {
    // Chat state
    messages: processedMessages,
    input,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setMessages,
    setInput,
    append,
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
