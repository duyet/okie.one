"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { APP_NAME } from "@/lib/config"
import { Info } from "@phosphor-icons/react"
import { AppInfoContent } from "./app-info-content"

type AppInfoTriggerProps = {
  trigger?: React.ReactNode
}

export function AppInfoTrigger({ trigger }: AppInfoTriggerProps) {
  const isMobile = useBreakpoint(768)

  const defaultTrigger = (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <Info className="size-4" />
      About {APP_NAME}
    </DropdownMenuItem>
  )

  if (isMobile) {
    return (
      <>
        <Drawer>
          <DrawerTrigger asChild>{defaultTrigger || trigger}</DrawerTrigger>
          <DrawerContent className="bg-background border-border">
            <DrawerHeader>
              <img
                src="/banner_ocean.jpg"
                alt={`calm paint generate by ${APP_NAME}`}
                className="h-32 w-full object-cover"
              />
              <DrawerTitle className="hidden">{APP_NAME}</DrawerTitle>
              <DrawerDescription className="hidden">
                Your minimalist AI chat companion
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <AppInfoContent />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{defaultTrigger || trigger}</DialogTrigger>
        <DialogContent className="[&>button:last-child]:bg-background gap-0 overflow-hidden rounded-3xl p-0 shadow-xs sm:max-w-md [&>button:last-child]:rounded-full [&>button:last-child]:p-1">
          <DialogHeader className="p-0">
            <img
              src="/banner_ocean.jpg"
              alt={`calm paint generate by ${APP_NAME}`}
              className="h-32 w-full object-cover"
            />
            <DialogTitle className="hidden">{APP_NAME}</DialogTitle>
            <DialogDescription className="hidden">
              Your minimalist AI chat companion
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <AppInfoContent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
