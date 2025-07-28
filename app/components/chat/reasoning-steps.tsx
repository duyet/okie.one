"use client"

import { CaretDownIcon } from "@phosphor-icons/react"
import { AnimatePresence, motion, type Transition } from "motion/react"
import { useState } from "react"

import { cn } from "@/lib/utils"

type ReasoningStepsProps = {
  steps: Array<{
    title: string
    content: string
    nextStep?: "continue" | "finalAnswer"
  }>
  isStreaming?: boolean
}

const TRANSITION = {
  type: "spring",
  duration: 0.2,
  bounce: 0,
} as Transition

export function ReasoningSteps({ steps, isStreaming }: ReasoningStepsProps) {
  const [wasStreaming, setWasStreaming] = useState(isStreaming ?? false)
  const [isExpanded, setIsExpanded] = useState(() => isStreaming ?? true)

  if (wasStreaming && isStreaming === false) {
    setWasStreaming(false)
    setIsExpanded(false)
  }

  if (!steps || steps.length === 0) {
    return null
  }

  return (
    <div>
      <button
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span>Sequential Reasoning ({steps.length} steps)</span>
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
            <div className="flex flex-col gap-3 border-muted-foreground/20 border-l pl-4">
              {steps.map((step, index) => (
                <motion.div
                  key={`step-${step.title}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  {/* Step number indicator */}
                  <div className="-left-[25px] absolute flex size-6 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground text-xs">
                    {index + 1}
                  </div>

                  {/* Step content */}
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="mb-1 font-semibold text-sm">{step.title}</h4>
                    <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                      {step.content}
                    </p>

                    {/* Progress indicator */}
                    {step.nextStep === "continue" &&
                      index === steps.length - 1 &&
                      isStreaming && (
                        <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                          <motion.div
                            className="size-2 rounded-full bg-muted-foreground"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                          <span>Thinking...</span>
                        </div>
                      )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
