import { BrainIcon, CaretDownIcon, CheckIcon } from "@phosphor-icons/react"
import { memo, useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { MCP_SERVER_IDS } from "@/lib/user-preference-store/mcp-config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"

import { PopoverContentAuth } from "./popover-content-auth"

export type ThinkingMode = "none" | "regular" | "sequential"

type ButtonThinkProps = {
  thinkingMode?: ThinkingMode
  onModeChange?: (mode: ThinkingMode) => void
  isAuthenticated: boolean
  hasNativeReasoning?: boolean
}

// Create an environment context hook for better testability
const useEnvironmentContext = () => {
  return useMemo(
    () => ({
      isTestEnvironment:
        process.env.NODE_ENV === "test" ||
        process.env.NODE_ENV === "development" ||
        (typeof window !== "undefined" &&
          window.location.hostname === "localhost"),
    }),
    []
  )
}

export const ButtonThink = memo(function ButtonThink({
  thinkingMode = "none",
  onModeChange,
  isAuthenticated,
  hasNativeReasoning = false,
}: ButtonThinkProps) {
  const { isMcpServerEnabled } = useUserPreferences()
  const { isTestEnvironment } = useEnvironmentContext()

  const isSelected = thinkingMode !== "none"
  const isSequentialThinkingEnabled = isMcpServerEnabled(
    MCP_SERVER_IDS.SEQUENTIAL_THINKING
  )

  // Compute availability once
  const availability = useMemo(
    () => ({
      showButton: isSequentialThinkingEnabled || hasNativeReasoning,
      allowGuestAccess: isAuthenticated || isTestEnvironment,
      shouldResetMode:
        !isSequentialThinkingEnabled && thinkingMode === "sequential",
    }),
    [
      isSequentialThinkingEnabled,
      hasNativeReasoning,
      isAuthenticated,
      isTestEnvironment,
      thinkingMode,
    ]
  )

  // Auto-reset invalid thinking mode
  if (availability.shouldResetMode) {
    onModeChange?.("none")
  }

  // Hide if no thinking capabilities available
  if (!availability.showButton) {
    return null
  }

  // Show auth required popover for guests (except in test environment)
  if (!availability.allowGuestAccess) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            className="rounded-full border border-border bg-transparent dark:bg-secondary"
            data-testid="think-button"
          >
            <BrainIcon className="size-5" />
            {hasNativeReasoning ? "Thinking" : "Sequential Thinking MCP"}
          </Button>
        </PopoverTrigger>
        <PopoverContentAuth />
      </Popover>
    )
  }

  // Common button styles
  const buttonStyles = cn(
    "rounded-full border border-border bg-transparent transition-all duration-150 has-[>svg]:px-1.75 md:has-[>svg]:px-3 dark:bg-secondary",
    isSelected &&
      "border-[#0091FF]/20 bg-[#E5F3FE] text-[#0091FF] hover:bg-[#E5F3FE] hover:text-[#0091FF]"
  )

  // For non-reasoning models, show toggle button
  if (!hasNativeReasoning) {
    return (
      <Button
        variant="secondary"
        className={buttonStyles}
        onClick={() =>
          onModeChange?.(thinkingMode === "sequential" ? "none" : "sequential")
        }
        data-testid="think-button"
        aria-pressed={thinkingMode === "sequential"}
        aria-label="Toggle Sequential Thinking MCP"
      >
        <BrainIcon className="size-5" />
        <span className="hidden md:block">Sequential Thinking MCP</span>
      </Button>
    )
  }

  // Get dropdown label based on current mode
  const getDropdownLabel = () => {
    switch (thinkingMode) {
      case "sequential":
        return "Sequential Thinking MCP"
      case "regular":
        return "Thinking (Native)"
      default:
        return "Thinking"
    }
  }

  // For reasoning models, show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className={buttonStyles}
          data-testid="think-button"
          aria-label="Select thinking mode"
        >
          <BrainIcon className="size-5" />
          <span className="hidden md:block">{getDropdownLabel()}</span>
          <CaretDownIcon className="ml-1 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => onModeChange?.("none")}
          className="flex items-center justify-between"
        >
          Disable Thinking
          {thinkingMode === "none" && <CheckIcon className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onModeChange?.("regular")}
          className="flex items-center justify-between"
        >
          Thinking (Native)
          {thinkingMode === "regular" && <CheckIcon className="size-4" />}
        </DropdownMenuItem>
        {isSequentialThinkingEnabled && (
          <DropdownMenuItem
            onClick={() => onModeChange?.("sequential")}
            className="flex items-center justify-between"
          >
            Sequential Thinking MCP
            {thinkingMode === "sequential" && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
