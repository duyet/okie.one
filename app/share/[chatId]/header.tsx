import Link from "next/link"

import { APP_NAME } from "@/lib/config"

export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 h-app-header">
      <div className="pointer-events-none absolute top-app-header left-0 z-50 mx-auto h-app-header w-full bg-background to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden"></div>
      <div className="relative mx-auto flex h-full max-w-6xl items-center justify-between bg-background px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <Link href="/" className="font-medium text-xl tracking-tight">
          {APP_NAME}
        </Link>
      </div>
    </header>
  )
}
