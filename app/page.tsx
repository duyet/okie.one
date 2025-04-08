import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import Chat from "./components/chat/chat"
import LayoutApp from "./components/layout/layout-app"

export default async function Home() {
  return (
    <MessagesProvider>
      <LayoutApp>
        <Chat />
      </LayoutApp>
    </MessagesProvider>
  )
}
