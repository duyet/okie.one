"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useSettings } from "@/lib/settings-store/provider"

import { SettingsContent } from "./settings-content"

export function SettingsModal() {
  const { isOpen, closeSettings, activeTab, setActiveTab } = useSettings()
  const isMobile = useBreakpoint(768)

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
        <DrawerContent>
          <SettingsContent
            isDrawer
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="flex h-[80%] min-h-[480px] w-full flex-col gap-0 p-0 sm:max-w-[768px]">
        <DialogHeader className="border-border border-b px-6 py-5">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsContent activeTab={activeTab} onTabChange={setActiveTab} />
      </DialogContent>
    </Dialog>
  )
}