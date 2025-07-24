import { ArrowLeft } from "@phosphor-icons/react"
import Link from "next/link"

export function HeaderGoBack({ href = "/" }: { href?: string }) {
  return (
    <header className="p-4">
      <Link
        href={href}
        prefetch
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-foreground hover:bg-muted"
      >
        <ArrowLeft className="size-5 text-foreground" />
        <span className="ml-2 hidden font-base text-sm sm:inline-block">
          Back to Chat
        </span>
      </Link>
    </header>
  )
}
