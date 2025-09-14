"use client"

import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import type { Message, UIMessage } from "@/lib/ai-sdk-types"
import { uiMessageToMessage } from "@/lib/ai-sdk-types"
import { Conversation } from "@/app/components/chat/conversation"
import { useModel } from "@/app/components/chat/use-model"
import { ChatInput } from "@/app/components/chat-input/chat-input"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"

import { ErrorBoundary } from "../error-boundary"
import { ArtifactProvider, useArtifact } from "./artifact-context"
import { ArtifactPanel } from "./artifact-panel"
import { useChatCore } from "./use-chat-core"
import { useChatOperations } from "./use-chat-operations"
import { useFileUpload } from "./use-file-upload"

const FeedbackWidget = dynamic(
  () => import("./feedback-widget").then((mod) => mod.FeedbackWidget),
  { ssr: false }
)

const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
)

const GuestRateLimitDialog = dynamic(
  () =>
    import("../guest/guest-rate-limit-dialog").then(
      (mod) => mod.GuestRateLimitDialog
    ),
  { ssr: false }
)

function ChatInner() {
  const { chatId } = useChatSession()
  const { isOpen, currentArtifact, closeArtifact } = useArtifact()
  const {
    createNewChat,
    getChatById,
    updateChatModel,
    bumpChat,
    isLoading: isChatsLoading,
  } = useChats()

  const currentChat = useMemo(
    () => (chatId ? getChatById(chatId) : null),
    [chatId, getChatById]
  )

  const {
    messages: rawMessages,
    cacheAndAddMessage: originalCacheAndAddMessage,
    setHasActiveChatSession,
  } = useMessages()
  
  // Convert MessageAISDK[] to Message[] to ensure content property exists
  const initialMessages = useMemo(
    () => rawMessages.map(msg => uiMessageToMessage(msg as UIMessage)),
    [rawMessages]
  )
  
  // Wrap cacheAndAddMessage to handle type conversion
  const cacheAndAddMessage = useCallback(
    (message: Message) => {
      // Convert Message back to MessageAISDK format
      const aiMessage = {
        ...message,
        role: message.role as "system" | "user" | "assistant",
      }
      originalCacheAndAddMessage(aiMessage)
    },
    [originalCacheAndAddMessage]
  )
  
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const { draftValue, clearDraft } = useChatDraft(chatId)

  // Model selection
  const { selectedModel, handleModelChange } = useModel({
    currentChat: currentChat || null,
    user,
    updateChatModel,
    chatId,
  })

  // File upload functionality
  const {
    files,
    setFiles,
    handleFileUploads,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload(selectedModel)

  // State to pass between hooks
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [hasRateLimitDialog, setHasRateLimitDialog] = useState(false)
  const isAuthenticated = useMemo(
    () => !!user?.id && !user?.anonymous,
    [user?.id, user?.anonymous]
  )
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Chat operations (utils + handlers) - created first
  const {
    checkLimitsAndNotify,
    ensureChatExists,
    updateUrlForChat,
    handleDelete,
    handleEdit,
  } = useChatOperations({
    isAuthenticated,
    chatId,
    messages: initialMessages,
    selectedModel,
    systemPrompt,
    createNewChat,
    setHasDialogAuth,
    setHasRateLimitDialog,
    setMessages: () => {},
    setInput: () => {},
  })

  // Core chat functionality (initialization + state + actions)
  const {
    messages,
    input,
    status,
    stop,
    hasSentFirstMessageRef,
    isSubmitting,
    enableSearch,
    setEnableSearch,
    thinkingMode,
    setThinkingMode,
    submit,
    handleSuggestion,
    handleReload,
    handleInputChange,
  } = useChatCore({
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
  })

  // Memoize the conversation props to prevent unnecessary rerenders
  const conversationProps = useMemo(
    () => ({
      messages,
      status,
      onDelete: handleDelete,
      onEdit: handleEdit,
      onReload: handleReload,
    }),
    [messages, status, handleDelete, handleEdit, handleReload]
  )

  // Memoize the chat input props
  const chatInputProps = useMemo(
    () => ({
      value: input,
      onSuggestion: handleSuggestion,
      onValueChange: handleInputChange,
      onSend: submit,
      isSubmitting,
      files,
      onFileUpload: handleFileUpload,
      onFileRemove: handleFileRemove,
      hasSuggestions:
        preferences.promptSuggestions && !chatId && messages.length === 0,
      onSelectModel: handleModelChange,
      selectedModel,
      isUserAuthenticated: isAuthenticated,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      setThinkingMode,
      thinkingMode,
    }),
    [
      input,
      handleSuggestion,
      handleInputChange,
      submit,
      isSubmitting,
      files,
      handleFileUpload,
      handleFileRemove,
      preferences.promptSuggestions,
      chatId,
      messages.length,
      handleModelChange,
      selectedModel,
      isAuthenticated,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      setThinkingMode,
      thinkingMode,
    ]
  )

  // Handle redirect for invalid chatId - only redirect if we're certain the chat doesn't exist
  // and we're not in a transient state during chat creation
  if (
    chatId &&
    !isChatsLoading &&
    !currentChat &&
    !isSubmitting &&
    status === "ready" &&
    messages.length === 0 &&
    !hasSentFirstMessageRef.current // Don't redirect if we've already sent a message in this session
  ) {
    return redirect("/")
  }

  const showOnboarding = !chatId && messages.length === 0

  console.log("-> messages", messages)

  return (
    <>
      <div
        className={cn(
          "@container/main relative flex h-full flex-col items-center justify-end md:justify-center",
          isOpen && "pr-[50%]" // Make space for artifact panel
        )}
      >
        <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />
        <GuestRateLimitDialog
          open={hasRateLimitDialog}
          onOpenChange={setHasRateLimitDialog}
        />

        <AnimatePresence initial={false} mode="popLayout">
          {showOnboarding ? (
            <motion.div
              key="onboarding"
              className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              layout="position"
              layoutId="onboarding"
              transition={{
                layout: {
                  duration: 0,
                },
              }}
            >
              <h1 className="mb-6 font-medium text-3xl tracking-tight">
                What&apos;s on your mind?
              </h1>
            </motion.div>
          ) : (
            <Conversation key="conversation" {...conversationProps} />
          )}
        </AnimatePresence>

        <motion.div
          className={cn(
            "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
          )}
          layout="position"
          layoutId="chat-input-container"
          transition={{
            layout: {
              duration: messages.length === 1 ? 0.3 : 0,
            },
          }}
        >
          <ChatInput {...chatInputProps} />
        </motion.div>

        <FeedbackWidget authUserId={user?.id} />
      </div>

      {/* Artifact Panel */}
      <ArtifactPanel
        isOpen={isOpen}
        onClose={closeArtifact}
        artifact={currentArtifact}
      />
    </>
  )
}

export function Chat() {
  return (
    <ErrorBoundary>
      <ArtifactProvider>
        <ChatInner />
      </ArtifactProvider>
    </ErrorBoundary>
  )
}
