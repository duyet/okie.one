import { BrainIcon, CaretDownIcon, CheckIcon } from "@phosphor-icons/react"
import { memo } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ThinkingMode = "none" | "regular"

type ButtonThinkProps = {
  thinkingMode?: ThinkingMode
  onModeChange?: (mode: ThinkingMode) => void
  hasNativeReasoning?: boolean
}

export const ButtonThink = memo(function ButtonThink({
  thinkingMode = "none",
  onModeChange,
  hasNativeReasoning = false,
}: ButtonThinkProps) {
  const isSelected = thinkingMode !== "none"

  // Hide if no thinking capabilities available
  if (!hasNativeReasoning) {
    return null
  }

  // Common button styles
  const buttonStyles = cn(
    "rounded-full border border-border bg-transparent transition-all duration-150 has-[>svg]:px-1.75 md:has-[>svg]:px-3 dark:bg-secondary",
    isSelected &&
      "border-[#0091FF]/20 bg-[#E5F3FE] text-[#0091FF] hover:bg-[#E5F3FE] hover:text-[#0091FF]"
  )

  // Get dropdown label based on current mode
  const getDropdownLabel = () => {
    switch (thinkingMode) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
