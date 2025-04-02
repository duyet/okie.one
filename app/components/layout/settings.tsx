"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { AUTH_DAILY_MESSAGE_LIMIT } from "@/app/lib/config"
import { createClient } from "@/app/lib/supabase/client"
import type { Database } from "@/app/types/database.types"
import { ModelSelector } from "@/components/common/model-selector"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SignOut, User, X } from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState } from "react"

type UserType = Database["public"]["Tables"]["users"]["Row"]

interface SettingsProps {
  user: UserType
  trigger?: React.ReactNode
}

export function Settings({ user, trigger }: SettingsProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useBreakpoint(768)

  const handleClose = () => setOpen(false)

  const defaultTrigger = (
    <DropdownMenuItem
      onSelect={(e) => e.preventDefault()}
      onClick={() => setOpen(true)}
    >
      <User className="size-4" />
      <span>Settings</span>
    </DropdownMenuItem>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
        <DrawerContent>
          <SettingsContent isDrawer onClose={handleClose} user={user} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsContent onClose={handleClose} user={user} />
      </DialogContent>
    </Dialog>
  )
}

function SettingsContent({
  onClose,
  isDrawer = false,
  user,
}: {
  onClose: () => void
  isDrawer?: boolean
  user: UserType
}) {
  const { theme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme || "system")
  const [selectedModelId, setSelectedModelId] = useState<string>(
    user?.preferred_model || "gpt-4o"
  )
  const supabase = createClient()
  const router = useRouter()

  const handleModelChange = async (value: string) => {
    setSelectedModelId(value)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("users")
        .update({ preferred_model: value })
        .eq("id", user.id)

      if (error) {
        console.error("Error updating preferred model:", error)
      }
    } catch (err) {
      console.error("Failed to update preferred model:", err)
    }
  }

  const themes = [
    { id: "system", name: "System", colors: ["#ffffff", "#1a1a1a"] },
    { id: "light", name: "Light", colors: ["#ffffff"] },
    { id: "dark", name: "Dark", colors: ["#1a1a1a"] },
  ]

  return (
    <div
      className={cn(
        "max-h-[70vh] space-y-0 overflow-y-auto",
        isDrawer ? "p-0 pb-16" : "py-0"
      )}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2">
          <h2 className="text-lg font-medium">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User Info */}
      <div className="px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="bg-muted flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
            {user?.profile_image ? (
              <img
                src={user.profile_image || "/placeholder.svg"}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="text-muted-foreground size-8" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">{user?.display_name}</h3>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Message Usage */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">Message Usage</h3>
          <div className="bg-secondary rounded-lg p-3">
            <div className="mb-2 flex justify-between">
              <span className="text-secondary-foreground text-sm">Today</span>
              <span className="text-sm font-medium">
                {user?.daily_message_count} / {AUTH_DAILY_MESSAGE_LIMIT}{" "}
                messages
              </span>
            </div>
            <div className="bg-muted h-1.5 w-full rounded-full">
              <div
                className="bg-primary h-1.5 rounded-full"
                style={{
                  width: `${
                    ((user?.daily_message_count || 0) /
                      AUTH_DAILY_MESSAGE_LIMIT) *
                    100
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Limit of {AUTH_DAILY_MESSAGE_LIMIT} messages per day
            </p>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">Theme</h3>
          <div
            className={`grid ${isDrawer ? "grid-cols-2" : "grid-cols-3"} gap-3`}
          >
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setSelectedTheme(theme.id)
                  setTheme(theme.id)
                }}
                className={`rounded-lg border p-3 ${
                  selectedTheme === theme.id
                    ? "border-primary ring-primary/30 ring-2"
                    : "border-border"
                }`}
              >
                <div className="mb-2 flex space-x-1">
                  {theme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="border-border h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-left text-sm font-medium">{theme.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">Preferred Model</h3>
          <div className="relative">
            <ModelSelector
              selectedModelId={selectedModelId}
              setSelectedModelId={handleModelChange}
              className="w-full"
            />
            {/* <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => (
                  <SelectGroup key={provider.id}>
                    <SelectLabel>{provider.name}</SelectLabel>
                    {MODELS.filter(
                      (model) => model.provider === provider.id
                    ).map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select> */}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            This model will be used by default for new conversations
          </p>
        </div>
      </div>

      {/* Sign Out */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Account</h3>
              <p className="text-muted-foreground text-xs">
                Log out on this device
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => {
                supabase.auth.signOut()
                router.push("/")
              }}
            >
              <SignOut className="size-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account, not ready yet */}
      {/* <div className="border-border border-t">
        <div className="px-6 py-4">
          <div
            className={`flex ${
              isDrawer ? "flex-col space-y-3" : "items-center justify-between"
            }`}
          >
            <div>
              <h3 className="text-sm font-medium">Delete Account</h3>
              <p className="text-muted-foreground max-w-xs text-xs">
                Permanently delete your account and associated data. Deletions
                are immediate and cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className={`${
                isDrawer ? "mt-3 self-start" : "whitespace-nowrap"
              }`}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div> */}
    </div>
  )
}
