import type { Chat } from "@/lib/chat-store/types"

import { SidebarItem } from "./sidebar-item"

type SidebarListProps = {
  title: string
  items: Chat[]
  currentChatId: string
}

export function SidebarList({ title, items, currentChatId }: SidebarListProps) {
  return (
    <div>
      <h3 className="overflow-hidden text-ellipsis break-all px-2 pt-3 pb-2 font-semibold text-xs">
        {title}
      </h3>
      <div className="space-y-0.5">
        {items.map((chat) => (
          <SidebarItem
            key={chat.id}
            chat={chat}
            currentChatId={currentChatId}
          />
        ))}
      </div>
    </div>
  )
}
