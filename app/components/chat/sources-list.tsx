"use client"

import type { SourceUrlUIPart } from "ai"
import { CaretDown, Link } from "@phosphor-icons/react"
import { AnimatePresence, motion, type Transition } from "motion/react"
import Image from "next/image"
import { useState } from "react"

import { cn } from "@/lib/utils"

import { addUTM, formatUrl, getFavicon } from "./utils"

type SourcesListProps = {
  sources: SourceUrlUIPart[]
  className?: string
}

const TRANSITION = {
  type: "spring",
  duration: 0.2,
  bounce: 0,
} as Transition

export function SourcesList({ sources, className }: SourcesListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set())

  const handleFaviconError = (url: string) => {
    setFailedFavicons((prev) => new Set(prev).add(url))
  }

  return (
    <div className={cn("my-4", className)}>
      <div className="flex flex-col gap-0 overflow-hidden rounded-md border border-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          className="flex w-full flex-row items-center rounded-t-md px-3 py-2 transition-colors hover:bg-accent"
        >
          <div className="flex flex-1 flex-row items-center gap-2 text-left text-sm">
            Sources
            <div className="-space-x-1 flex">
              {sources?.map((source, index) => {
                const faviconUrl = getFavicon(source.url)
                const showFallback =
                  !faviconUrl || failedFavicons.has(source.url)

                return showFallback ? (
                  <div
                    key={`${source.url}-${index}`}
                    className="h-4 w-4 rounded-full border border-background bg-muted"
                  />
                ) : (
                  <Image
                    key={`${source.url}-${index}`}
                    src={faviconUrl}
                    alt={`Favicon for ${source.title}`}
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded-sm border border-background"
                    onError={() => handleFaviconError(source.url)}
                  />
                )
              })}
              {sources.length > 3 && (
                <span className="ml-1 text-muted-foreground text-xs">
                  +{sources.length - 3}
                </span>
              )}
            </div>
          </div>
          <CaretDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded ? "rotate-180 transform" : ""
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={TRANSITION}
              className="overflow-hidden"
            >
              <ul className="space-y-2 px-3 pt-3 pb-3">
                {sources.map((source, index) => {
                  const faviconUrl = getFavicon(source.url)
                  const showFallback =
                    !faviconUrl || failedFavicons.has(source.url)

                  return (
                    <li
                      key={`${source.url}-${index}`}
                      className="flex items-center text-sm"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <a
                          href={addUTM(source.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group line-clamp-1 flex items-center gap-1 text-primary hover:underline"
                        >
                          {showFallback ? (
                            <div className="h-4 w-4 flex-shrink-0 rounded-full bg-muted" />
                          ) : (
                            <Image
                              src={faviconUrl}
                              alt={`Favicon for ${source.title}`}
                              width={16}
                              height={16}
                              className="h-4 w-4 flex-shrink-0 rounded-sm"
                              onError={() => handleFaviconError(source.url)}
                            />
                          )}
                          <span className="truncate">{source.title}</span>
                          <Link className="inline h-3 w-3 flex-shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
                        </a>
                        <div className="line-clamp-1 text-muted-foreground text-xs">
                          {formatUrl(source.url)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
