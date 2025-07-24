"use client"

import { NotePencilIcon } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { useKeyShortcut } from "@/app/hooks/use-key-shortcut"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ButtonNewChat() {
  const pathname = usePathname()
  const router = useRouter()

  useKeyShortcut(
    (e) => (e.key === "u" || e.key === "U") && e.metaKey && e.shiftKey,
    () => router.push("/")
  )

  if (pathname === "/") return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/"
          className="rounded-full bg-background p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          prefetch
          aria-label="New Chat"
        >
          <NotePencilIcon size={24} />
        </Link>
      </TooltipTrigger>
      <TooltipContent>New Chat ⌘⇧U</TooltipContent>
    </Tooltip>
  )
}
