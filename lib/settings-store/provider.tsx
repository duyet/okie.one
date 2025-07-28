"use client"

import { createContext, useContext, type ReactNode, useState } from "react"

import type { TabType } from "@/app/components/layout/settings/settings-content"

interface SettingsContextType {
  isOpen: boolean
  activeTab: TabType
  openSettings: (tab?: TabType) => void
  closeSettings: () => void
  setActiveTab: (tab: TabType) => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("general")

  const openSettings = (tab: TabType = "general") => {
    setActiveTab(tab)
    setIsOpen(true)
  }

  const closeSettings = () => {
    setIsOpen(false)
  }

  const value: SettingsContextType = {
    isOpen,
    activeTab,
    openSettings,
    closeSettings,
    setActiveTab,
  }

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}