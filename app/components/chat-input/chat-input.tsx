"use client"

import { ArrowUpIcon, StopIcon } from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"

import { ModelSelector } from "@/components/common/model-selector/base"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/config"
import { getModelInfo } from "@/lib/models"

import { PromptSystem } from "../suggestions/prompt-system"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { ButtonThink, type ThinkingMode } from "./button-think"
import { FileList } from "./file-list"

type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUpload: (files: File[]) => void
  onFileRemove: (file: File) => void
  onSuggestion: (suggestion: string) => void
  hasSuggestions?: boolean
  onSelectModel: (model: string) => void
  selectedModel: string
  isUserAuthenticated: boolean
  stop: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  setEnableSearch: (enabled: boolean) => void
  enableSearch: boolean
  setThinkingMode: (mode: ThinkingMode) => void
  thinkingMode: ThinkingMode
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  isSubmitting,
  files,
  onFileUpload,
  onFileRemove,
  onSuggestion,
  hasSuggestions,
  onSelectModel,
  selectedModel,
  isUserAuthenticated,
  stop,
  status,
  setEnableSearch,
  enableSearch,
  setThinkingMode,
  thinkingMode,
}: ChatInputProps) {
  const [isMounted, setIsMounted] = useState(false)
  const selectModelConfig = getModelInfo(selectedModel)
  const hasSearchSupport = Boolean(selectModelConfig?.webSearch)
  const hasThinkingSupport = Boolean(selectModelConfig?.tools)
  const hasNativeReasoning = Boolean(selectModelConfig?.reasoningText)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isOnlyWhitespace = useCallback(
    (text: string) => !/[^\s]/.test(text),
    []
  )

  const handleSend = useCallback(() => {
    if (isSubmitting) {
      return
    }

    if (status === "streaming") {
      stop()
      return
    }

    onSend()
  }, [isSubmitting, onSend, status, stop])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && status === "streaming") {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (isOnlyWhitespace(value)) {
          return
        }

        e.preventDefault()
        onSend()
      }
    },
    [isSubmitting, onSend, status, value, isOnlyWhitespace]
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const hasImageContent = Array.from(items).some((item) =>
        item.type.startsWith("image/")
      )

      if (hasImageContent) {
        const imageFiles: File[] = []

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) {
              const newFile = new File(
                [file],
                `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
                { type: file.type }
              )
              imageFiles.push(newFile)
            }
          }
        }

        if (imageFiles.length > 0) {
          if (isUserAuthenticated) {
            onFileUpload(imageFiles)
          } else {
            // Don't handle the paste for unauthenticated users
            return
          }
        }
      }
      // Text pasting will work by default for everyone
    },
    [onFileUpload, isUserAuthenticated]
  )

  useEffect(() => {
    if (!hasSearchSupport && enableSearch) {
      setEnableSearch?.(false)
    }
  }, [hasSearchSupport, enableSearch, setEnableSearch])

  useEffect(() => {
    if (!hasThinkingSupport && thinkingMode !== "none") {
      setThinkingMode?.("none")
    }
  }, [hasThinkingSupport, thinkingMode, setThinkingMode])

  return (
    <div className="relative flex w-full flex-col gap-4">
      {hasSuggestions && (
        <PromptSystem
          onValueChange={onValueChange}
          onSuggestion={onSuggestion}
          value={value}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="relative z-10 bg-popover p-0 pt-1 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={onValueChange}
        >
          <FileList files={files} onFileRemove={onFileRemove} />
          <PromptInputTextarea
            placeholder={`Ask ${APP_NAME}`}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />
          <PromptInputActions className="mt-5 w-full justify-between px-3 pb-3">
            <div className="flex gap-2">
              <ButtonFileUpload
                onFileUpload={onFileUpload}
                model={selectedModel}
                isUserAuthenticated={isUserAuthenticated}
              />
              {hasThinkingSupport && (
                <ButtonThink
                  thinkingMode={thinkingMode}
                  onModeChange={setThinkingMode}
                  isAuthenticated={isUserAuthenticated}
                  hasNativeReasoning={hasNativeReasoning}
                />
              )}
              {hasSearchSupport ? (
                <ButtonSearch
                  isSelected={enableSearch}
                  onToggle={setEnableSearch}
                  isAuthenticated={isUserAuthenticated}
                />
              ) : null}
            </div>
            <div className="flex gap-2">
              <ModelSelector
                selectedModelId={selectedModel}
                setSelectedModelId={onSelectModel}
                isUserAuthenticated={isUserAuthenticated}
                className="rounded-full"
              />
              <PromptInputAction
                tooltip={status === "streaming" ? "Stop" : "Send"}
              >
                <Button
                  size="sm"
                  className="size-9 rounded-full transition-all duration-300 ease-out"
                  disabled={
                    !isMounted ||
                    !value ||
                    isSubmitting ||
                    isOnlyWhitespace(value)
                  }
                  type="button"
                  onClick={handleSend}
                  aria-label={status === "streaming" ? "Stop" : "Send message"}
                >
                  {status === "streaming" ? (
                    <StopIcon className="size-4" />
                  ) : (
                    <ArrowUpIcon className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </div>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}
