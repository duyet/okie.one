import { History } from "@/app/chat/components/history/history"
import { createClient } from "@/app/chat/lib/supabase/server"
import { Database } from "@/app/chat/types/database.types"
import Link from "next/link"
import { APP_NAME } from "../../lib/config"
import { AppInfo } from "./app-info"
import { ButtonNewChat } from "./button-new-chat"
import UserMenu from "./user-menu"

export async function Header() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const isLoggedIn = data.user !== null

  let userProfile = null
  if (data.user) {
    const { data: userProfileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user?.id)
      .single()
    userProfile = userProfileData
  }

  const userData = {
    ...userProfile,
    profile_image: data.user?.user_metadata.avatar_url,
    display_name: data.user?.user_metadata.name,
  } as Database["public"]["Tables"]["users"]["Row"]

  return (
    <header className="h-app-header fixed top-0 right-0 left-0 z-50">
      <div className="h-app-header top-app-header bg-background pointer-events-none absolute left-0 z-50 mx-auto w-full to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden"></div>
      <div className="bg-background relative mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <Link href="/chat" className="text-xl font-medium tracking-tight">
          {APP_NAME}
        </Link>
        {!isLoggedIn ? (
          <div className="flex items-center gap-4">
            <AppInfo />
            <Link
              href="/chat/auth"
              className="font-base text-muted-foreground hover:text-foreground text-base transition-colors"
            >
              Login
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ButtonNewChat
              userId={data.user.id}
              preferredModel={userData.preferred_model!}
            />
            <History />
            <UserMenu user={userData} />
          </div>
        )}
      </div>
    </header>
  )
}
