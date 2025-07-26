"use client"

import React from "react"
import { FileArrowUp, Paperclip } from "@phosphor-icons/react"
import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getModelFileCapabilities,
  validateModelSupportsFiles,
} from "@/lib/file-handling"
import { isSupabaseEnabledClient } from "@/lib/supabase/config"

type ButtonFileUploadProps = {
  onFileUpload: (files: File[]) => void
  model: string
}

export function ButtonFileUpload({
  onFileUpload,
  model,
}: ButtonFileUploadProps) {
  const isFileUploadAvailable = validateModelSupportsFiles(model)
  const fileCapabilities = getModelFileCapabilities(model)

  // Generate accept string from model capabilities
  const acceptTypes = fileCapabilities?.supportedTypes?.join(",") || "image/*"


  // Common button component with proper ref forwarding
  const FileUploadButton = React.forwardRef<
    HTMLButtonElement,
    { disabled?: boolean }
  >(({ disabled = false }, ref) => (
    <Button
      ref={ref}
      size="sm"
      variant="secondary"
      className="size-9 rounded-full border border-border bg-transparent dark:bg-secondary"
      type="button"
      disabled={disabled}
      aria-label="Add files"
    >
      <Paperclip className="size-4" />
    </Button>
  ))

  // Determine if file upload should be disabled
  let popoverContent: React.ReactNode = null
  let isDisabled = false
  let tooltipText = "Add files"

  if (!isSupabaseEnabledClient) {
    popoverContent = (
      <div className="text-secondary-foreground text-sm">
        <div className="mb-1 font-medium">File uploads are disabled</div>
        <div className="text-xs">
          File storage requires Supabase configuration.
          <br />
          Set NEXT_PUBLIC_SUPABASE_URL and other
          <br />
          environment variables to enable uploads.
        </div>
      </div>
    )
    isDisabled = true
    tooltipText = "File uploads disabled - Database not configured"
  } else if (!isFileUploadAvailable) {
    popoverContent = (
      <div className="text-secondary-foreground text-sm">
        This model ({model}) does not support file uploads.
        <br />
        Please select another model with vision capabilities.
      </div>
    )
    isDisabled = true
    tooltipText = `File uploads not supported by ${model}`
  }
  // Removed the unauthenticated user block - now they can upload!

  // If we need a popover (only for disabled states now)
  if (popoverContent) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <FileUploadButton disabled={isDisabled} />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
        <PopoverContent className="p-2">{popoverContent}</PopoverContent>
      </Popover>
    )
  }

  // Fully functional file upload for all users with supported models
  return (
    <FileUpload
      onFilesAdded={onFileUpload}
      multiple
      disabled={false}
      accept={acceptTypes}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <FileUploadTrigger asChild>
            <FileUploadButton />
          </FileUploadTrigger>
        </TooltipTrigger>
        <TooltipContent>Add files</TooltipContent>
      </Tooltip>
      
      <FileUploadContent>
        <div className="flex flex-col items-center rounded-lg border border-input border-dashed bg-background p-8">
          <FileArrowUp className="size-8 text-muted-foreground" />
          <span className="mt-4 mb-1 font-medium text-lg">Drop files here</span>
          <span className="text-muted-foreground text-sm">
            Drop any files here to add it to the conversation
          </span>
        </div>
      </FileUploadContent>
    </FileUpload>
  )
}
