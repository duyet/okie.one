import { MODEL_DEFAULT } from "@/lib/config"
import { createClient } from "@/lib/supabase/server"
import Chat from "./components/chat/chat"
import LayoutApp from "./components/layout/layout-app"

export default async function Home() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  const { data: user } = await supabase
    .from("users")
    .select("preferred_model")
    .eq("id", auth?.user?.id || "")
    .single()

  return (
    <LayoutApp>
      <Chat
        userId={auth?.user?.id}
        preferredModel={user?.preferred_model || MODEL_DEFAULT}
      />
    </LayoutApp>
  )
}
