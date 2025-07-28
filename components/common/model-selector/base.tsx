"use client"

import {
  Brain,
  CaretDownIcon,
  Eye,
  GearIcon,
  GlobeHemisphereWest,
  MagnifyingGlassIcon,
  StarIcon,
  Wrench,
} from "@phosphor-icons/react"
import { useMemo, useRef, useState } from "react"

import { PopoverContentAuth } from "@/app/components/chat-input/popover-content-auth"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useKeyShortcut } from "@/app/hooks/use-key-shortcut"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useModel } from "@/lib/model-store/provider"
import { filterAndSortModels } from "@/lib/model-store/utils"
import type { ModelConfig } from "@/lib/models/types"
import { PROVIDERS } from "@/lib/providers"
import { useSettings } from "@/lib/settings-store/provider"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"

import { ProModelDialog } from "./pro-dialog"
import { SubMenu } from "./sub-menu"

type ModelSelectorProps = {
  selectedModelId: string
  setSelectedModelId: (modelId: string) => void
  className?: string
  isUserAuthenticated?: boolean
}

export function ModelSelector({
  selectedModelId,
  setSelectedModelId,
  className,
  isUserAuthenticated = true,
}: ModelSelectorProps) {
  const { models, isLoading: isLoadingModels, favoriteModels } = useModel()
  const { isModelHidden } = useUserPreferences()
  const { openSettings } = useSettings()

  const currentModel = models.find((model) => model.id === selectedModelId)

  // Create provider map for better performance and type safety
  const providerMap = useMemo(() => {
    const map = new Map()
    PROVIDERS.forEach((provider) => {
      map.set(provider.id, provider)
    })
    return map
  }, [])

  const currentProvider = currentModel?.icon
    ? providerMap.get(currentModel.icon)
    : null
  const isMobile = useBreakpoint(768)

  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isProDialogOpen, setIsProDialogOpen] = useState(false)
  const [selectedProModel, setSelectedProModel] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Ref for input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  useKeyShortcut(
    (e) => (e.key === "p" || e.key === "P") && e.metaKey && e.shiftKey,
    () => {
      if (isMobile) {
        setIsDrawerOpen((prev) => !prev)
      } else {
        setIsDropdownOpen((prev) => !prev)
      }
    }
  )

  const renderModelItem = (model: ModelConfig) => {
    const isLocked = !model.accessible
    const provider = model.icon ? providerMap.get(model.icon) : null
    const isSelected = selectedModelId === model.id

    return (
      <button
        key={model.id}
        type="button"
        role="option"
        aria-selected={isSelected}
        aria-label={`Select ${model.name} model`}
        aria-describedby={`${model.id}-capabilities`}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 text-left",
          isSelected && "bg-accent"
        )}
        onClick={() => {
          if (isLocked) {
            setSelectedProModel(model.id)
            setIsProDialogOpen(true)
            return
          }

          setSelectedModelId(model.id)
          if (isMobile) {
            setIsDrawerOpen(false)
          } else {
            setIsDropdownOpen(false)
          }
        }}
      >
        <div className="flex items-center gap-3">
          {provider?.icon && <provider.icon className="size-5" />}
          <div className="flex flex-col gap-0">
            <span className="text-sm">{model.name}</span>
          </div>
          <div
            className="ml-1 flex items-center gap-1"
            id={`${model.id}-capabilities`}
          >
            {model.vision && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/20">
                    <Eye className="size-2.5 text-green-600 dark:text-green-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[9999] text-xs">
                  Vision
                </TooltipContent>
              </Tooltip>
            )}
            {model.tools && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-full bg-blue-100 p-1 dark:bg-blue-900/20">
                    <Wrench className="size-2.5 text-blue-600 dark:text-blue-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[9999] text-xs">
                  Tools
                </TooltipContent>
              </Tooltip>
            )}
            {model.reasoning && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-full bg-purple-100 p-1 dark:bg-purple-900/20">
                    <Brain className="size-2.5 text-purple-600 dark:text-purple-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[9999] text-xs">
                  Reasoning
                </TooltipContent>
              </Tooltip>
            )}
            {model.webSearch && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-full bg-orange-100 p-1 dark:bg-orange-900/20">
                    <GlobeHemisphereWest className="size-2.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[9999] text-xs">
                  Web Search
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {isLocked && (
          <div className="flex items-center gap-0.5 rounded-full border border-input bg-accent px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
            <StarIcon className="size-2" />
            <span>Locked</span>
          </div>
        )}
      </button>
    )
  }

  // Get the hovered model data
  const hoveredModelData = models.find((model) => model.id === hoveredModel)

  // Memoize expensive filtering operations for better performance
  const filteredModels = useMemo(() => {
    return filterAndSortModels(
      models,
      favoriteModels || [],
      searchQuery,
      isModelHidden
    )
  }, [models, favoriteModels, searchQuery, isModelHidden])

  const trigger = (
    <Button
      variant="outline"
      className={cn("justify-between dark:bg-secondary", className)}
      disabled={isLoadingModels}
    >
      <div className="flex items-center gap-2">
        {currentProvider?.icon && <currentProvider.icon className="size-5" />}
        <span>{currentModel?.name || "Select model"}</span>
      </div>
      <CaretDownIcon className="size-4 opacity-50" />
    </Button>
  )

  // Handle input change without losing focus
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSearchQuery(e.target.value)
  }

  // If user is not authenticated, show the auth popover
  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "h-9 w-auto border border-border bg-transparent text-accent-foreground dark:bg-secondary",
                  className
                )}
                type="button"
              >
                {currentProvider?.icon && (
                  <currentProvider.icon className="size-5" />
                )}
                {currentModel?.name}
                <CaretDownIcon className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Select a model</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    )
  }

  if (isMobile) {
    return (
      <>
        <ProModelDialog
          isOpen={isProDialogOpen}
          setIsOpen={setIsProDialogOpen}
          currentModel={selectedProModel || ""}
        />
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Model</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search models..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-4 pb-6">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="mb-2 text-muted-foreground text-sm">
                    Loading models...
                  </p>
                </div>
              ) : filteredModels.length > 0 ? (
                filteredModels.map((model) => renderModelItem(model))
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="mb-2 text-muted-foreground text-sm">
                    No results found.
                  </p>
                  <a
                    href="https://github.com/ibelick/zola/issues/new?title=Model%20Request%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm underline"
                  >
                    Request a new model
                  </a>
                </div>
              )}

              {/* Settings link separator and link */}
              <div className="mx-4 my-2 border-border border-t" />
              <div className="px-4 pb-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    setIsDrawerOpen(false)
                    // Open settings modal with models tab
                    openSettings("models")
                  }}
                >
                  <GearIcon className="size-4 text-muted-foreground" />
                  <span>Manage Models</span>
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <div>
      <ProModelDialog
        isOpen={isProDialogOpen}
        setIsOpen={setIsProDialogOpen}
        currentModel={selectedProModel || ""}
      />
      <Tooltip>
        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={(open) => {
            setIsDropdownOpen(open)
            if (!open) {
              setHoveredModel(null)
              setSearchQuery("")
            } else {
              if (selectedModelId) setHoveredModel(selectedModelId)
            }
          }}
        >
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Switch model ⌘⇧P</TooltipContent>
          <DropdownMenuContent
            className="flex h-[320px] w-[300px] flex-col space-y-0.5 overflow-visible p-0"
            align="start"
            sideOffset={4}
            forceMount
            side="top"
          >
            <div className="sticky top-0 z-10 rounded-t-md border-b bg-background px-0 pt-0 pb-0">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search models..."
                  className="rounded-b-none border border-none pl-8 shadow-none focus-visible:ring-0 dark:bg-popover"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-1 pt-0 pb-0">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="mb-2 text-muted-foreground text-sm">
                    Loading models...
                  </p>
                </div>
              ) : filteredModels.length > 0 ? (
                filteredModels.map((model) => {
                  const isLocked = !model.accessible
                  const provider = model.icon
                    ? providerMap.get(model.icon)
                    : null
                  const isSelected = selectedModelId === model.id

                  return (
                    <DropdownMenuItem
                      key={model.id}
                      role="option"
                      aria-selected={isSelected}
                      aria-label={`Select ${model.name} model`}
                      aria-describedby={`dropdown-${model.id}-capabilities`}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2",
                        isSelected && "bg-accent"
                      )}
                      onSelect={() => {
                        if (isLocked) {
                          setSelectedProModel(model.id)
                          setIsProDialogOpen(true)
                          return
                        }

                        setSelectedModelId(model.id)
                        setIsDropdownOpen(false)
                      }}
                      onFocus={() => {
                        if (isDropdownOpen) {
                          setHoveredModel(model.id)
                        }
                      }}
                      onMouseEnter={() => {
                        if (isDropdownOpen) {
                          setHoveredModel(model.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {provider?.icon && <provider.icon className="size-5" />}
                        <div className="flex flex-col gap-0">
                          <span className="text-sm">{model.name}</span>
                        </div>
                        <div
                          className="ml-1 flex items-center gap-1"
                          id={`dropdown-${model.id}-capabilities`}
                        >
                          {model.vision && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/20">
                                  <Eye className="size-2.5 text-green-600 dark:text-green-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="z-[9999] text-xs"
                              >
                                Vision
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.tools && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="rounded-full bg-blue-100 p-1 dark:bg-blue-900/20">
                                  <Wrench className="size-2.5 text-blue-600 dark:text-blue-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="z-[9999] text-xs"
                              >
                                Tools
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.reasoning && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="rounded-full bg-purple-100 p-1 dark:bg-purple-900/20">
                                  <Brain className="size-2.5 text-purple-600 dark:text-purple-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="z-[9999] text-xs"
                              >
                                Reasoning
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.webSearch && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="rounded-full bg-orange-100 p-1 dark:bg-orange-900/20">
                                  <GlobeHemisphereWest className="size-2.5 text-orange-600 dark:text-orange-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="z-[9999] text-xs"
                              >
                                Web Search
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      {isLocked && (
                        <div className="flex items-center gap-0.5 rounded-full border border-input bg-accent px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                          <span>Locked</span>
                        </div>
                      )}
                    </DropdownMenuItem>
                  )
                })
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="mb-1 text-muted-foreground text-sm">
                    No results found.
                  </p>
                  <a
                    href="https://github.com/ibelick/zola/issues/new?title=Model%20Request%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm underline"
                  >
                    Request a new model
                  </a>
                </div>
              )}

              {/* Settings link separator and link */}
              <div className="mx-1 my-1 border-border border-t" />
              <div className="px-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    // Open settings modal with models tab
                    openSettings("models")
                  }}
                >
                  <GearIcon className="size-4 text-muted-foreground" />
                  <span>Manage Models</span>
                </button>
              </div>
            </div>

            {/* Submenu positioned absolutely */}
            {hoveredModelData && (
              <div className="absolute top-0 left-[calc(100%+8px)]">
                <SubMenu hoveredModelData={hoveredModelData} />
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </div>
  )
}
