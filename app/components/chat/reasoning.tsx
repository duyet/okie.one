import { Markdown } from "@/components/prompt-kit/markdown"
import { cn } from "@/lib/utils"
import { CaretDownIcon } from "@phosphor-icons/react"
import { AnimatePresence, motion, type Transition } from "motion/react"
import { useState } from "react"

type ReasoningProps = {
  reasoning: string
  isStreaming?: boolean
}

const TRANSITION = {
  type: "spring",
  duration: 0.2,
  bounce: 0,
} as Transition

export function Reasoning({ reasoning, isStreaming }: ReasoningProps) {
  const [wasStreaming, setWasStreaming] = useState(isStreaming ?? false)
  const [isExpanded, setIsExpanded] = useState(() => isStreaming ?? true)

  if (wasStreaming && isStreaming === false) {
    setWasStreaming(false)
    setIsExpanded(false)
  }

  return (
    <div>
      <button
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span>Reasoning</span>
        <CaretDownIcon
          className={cn(
            "size-3 transition-transform",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITION}
          >
            <div className="flex flex-col border-muted-foreground/20 border-l pl-4 text-muted-foreground text-sm">
              <Markdown>{reasoning}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
