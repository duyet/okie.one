"use client"

import { useTheme } from "next-themes"
import type React from "react"
import { useEffect, useState } from "react"
import { codeToHtml } from "shiki"

import { cn } from "@/lib/utils"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border",
        "rounded-xl border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  className,
  ...props
}: CodeBlockCodeProps) {
  const { resolvedTheme: appTheme } = useTheme()
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  useEffect(() => {
    async function highlight() {
      // Ensure code is a string and not empty
      if (typeof code !== "string" || !code.trim()) {
        setHighlightedHtml("")
        return
      }

      try {
        const html = await codeToHtml(code, {
          lang: language,
          theme: appTheme === "dark" ? "github-dark" : "github-light",
        })
        setHighlightedHtml(html)
      } catch (error) {
        console.error("Code highlighting failed:", error)
        setHighlightedHtml(`<pre><code>${code}</code></pre>`)
      }
    }
    highlight()
  }, [code, language, appTheme])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4 [&>pre]:!bg-background",
    className
  )

  // SSR fallback: render plain code if not hydrated yet
  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
