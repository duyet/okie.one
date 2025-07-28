import { BrainIcon, CaretDownIcon, CheckIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { PopoverContentAuth } from "./popover-content-auth"

export type ThinkingMode = "none" | "regular" | "sequential"

type ButtonThinkProps = {
  thinkingMode?: ThinkingMode
  onModeChange?: (mode: ThinkingMode) => void
  isAuthenticated: boolean
}

export function ButtonThink({
  thinkingMode = "none",
  onModeChange,
  isAuthenticated,
}: ButtonThinkProps) {
  const isSelected = thinkingMode !== "none"

  if (!isAuthenticated) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            className="rounded-full border border-border bg-transparent dark:bg-secondary"
            data-testid="think-button"
          >
            <BrainIcon className="size-5" />
            Think
          </Button>
        </PopoverTrigger>
        <PopoverContentAuth />
      </Popover>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className={cn(
            "rounded-full border border-border bg-transparent transition-all duration-150 has-[>svg]:px-1.75 md:has-[>svg]:px-3 dark:bg-secondary",
            isSelected &&
              "border-[#0091FF]/20 bg-[#E5F3FE] text-[#0091FF] hover:bg-[#E5F3FE] hover:text-[#0091FF]"
          )}
          data-testid="think-button"
        >
          <BrainIcon className="size-5" />
          <span className="hidden md:block">
            {thinkingMode === "sequential" ? "Sequential" : "Think"}
          </span>
          <CaretDownIcon className="size-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
          Think Mode
          {thinkingMode === "regular" && <CheckIcon className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onModeChange?.("sequential")}
          className="flex items-center justify-between"
        >
          Sequential Thinking
          {thinkingMode === "sequential" && <CheckIcon className="size-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
