import { Suspense } from "react"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { getUserProfile } from "@/lib/user/api"

import { FilesView } from "./files-view"

export default async function FilesPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return (
      <LayoutApp>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-muted-foreground">
              Sign in to view your files
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your uploaded files will appear here once you&apos;re authenticated.
            </p>
          </div>
        </div>
      </LayoutApp>
    )
  }

  return (
    <LayoutApp>
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4">
            <h1 className="text-lg font-semibold">Files</h1>
            <div className="ml-auto flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Manage your uploaded files and chat attachments
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          >
            <FilesView userId={userProfile.id} />
          </Suspense>
        </div>
      </div>
    </LayoutApp>
  )
}