import { Suspense } from "react"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { getUserProfile } from "@/lib/user/api"

import { FilesView } from "./files-view"

export default async function FilesPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return (
      <MessagesProvider>
        <LayoutApp>
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h1 className="font-semibold text-2xl text-muted-foreground">
                Sign in to view your files
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                Your uploaded files will appear here once you&apos;re
                authenticated.
              </p>
            </div>
          </div>
        </LayoutApp>
      </MessagesProvider>
    )
  }

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className="flex h-full flex-col">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <h1 className="font-semibold text-lg">Files</h1>
              <div className="ml-auto flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">
                  Manage your uploaded files and chat attachments
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
                </div>
              }
            >
              <FilesView userId={userProfile.id} />
            </Suspense>
          </div>
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
