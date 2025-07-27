import { BrainIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { PopoverContentAuth } from "./popover-content-auth"

type ButtonThinkProps = {
  isSelected?: boolean
  onToggle?: (isSelected: boolean) => void
  isAuthenticated: boolean
}

export function ButtonThink({
  isSelected = false,
  onToggle,
  isAuthenticated,
}: ButtonThinkProps) {
  const handleClick = () => {
    const newState = !isSelected
    onToggle?.(newState)
  }

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
    <Button
      variant="secondary"
      className={cn(
        "rounded-full border border-border bg-transparent transition-all duration-150 has-[>svg]:px-1.75 md:has-[>svg]:px-3 dark:bg-secondary",
        isSelected &&
          "border-[#0091FF]/20 bg-[#E5F3FE] text-[#0091FF] hover:bg-[#E5F3FE] hover:text-[#0091FF]"
      )}
      onClick={handleClick}
      data-testid="think-button"
    >
      <BrainIcon className="size-5" />
      <span className="hidden md:block">Think</span>
    </Button>
  )
}
