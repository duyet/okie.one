"use client"

import { createContext, type ReactNode, useCallback, useContext, useState } from "react"

import type { ContentPart } from "@/app/types/api.types"

interface ArtifactContextValue {
  isOpen: boolean
  currentArtifact: NonNullable<ContentPart["artifact"]> | null
  openArtifact: (artifact: NonNullable<ContentPart["artifact"]>) => void
  closeArtifact: () => void
}

const ArtifactContext = createContext<ArtifactContextValue | null>(null)

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentArtifact, setCurrentArtifact] = useState<NonNullable<
    ContentPart["artifact"]
  > | null>(null)

  const openArtifact = useCallback((artifact: NonNullable<ContentPart["artifact"]>) => {
    setCurrentArtifact(artifact)
    setIsOpen(true)
  }, [])

  const closeArtifact = useCallback(() => {
    setIsOpen(false)
    // Keep the artifact data for a moment to allow exit animation
    setTimeout(() => setCurrentArtifact(null), 300)
  }, [])

  return (
    <ArtifactContext.Provider
      value={{
        isOpen,
        currentArtifact,
        openArtifact,
        closeArtifact,
      }}
    >
      {children}
    </ArtifactContext.Provider>
  )
}

export function useArtifact() {
  const context = useContext(ArtifactContext)
  if (!context) {
    throw new Error("useArtifact must be used within an ArtifactProvider")
  }
  return context
}
