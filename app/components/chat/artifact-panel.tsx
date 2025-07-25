"use client"

import { X } from "@phosphor-icons/react/dist/ssr"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import type { ContentPart } from "@/app/types/api.types"

import { ArtifactDisplay } from "./artifact-display"

interface ArtifactPanelProps {
  isOpen: boolean
  onClose: () => void
  artifact: NonNullable<ContentPart["artifact"]> | null
}

export function ArtifactPanel({ isOpen, onClose, artifact }: ArtifactPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && artifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "50%", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed right-0 top-0 h-full bg-background border-l border-border overflow-hidden z-10"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">{artifact.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <ArtifactDisplay artifact={artifact} isInPanel={true} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}