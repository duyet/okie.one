"use client"

import { User } from "@phosphor-icons/react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useSettings } from "@/lib/settings-store/provider"

type SettingsTriggerProps = {
  onOpenChange?: (open: boolean) => void
}

export function SettingsTrigger({ onOpenChange }: SettingsTriggerProps) {
  const { openSettings } = useSettings()

  const handleClick = () => {
    openSettings()
    onOpenChange?.(true)
  }

  return (
    <DropdownMenuItem onSelect={handleClick}>
      <User className="size-4" />
      <span>Settings</span>
    </DropdownMenuItem>
  )
}
