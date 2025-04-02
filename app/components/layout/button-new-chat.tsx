"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotePencil } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import React from "react";
import { createNewChat } from "../../lib/api";

type ButtonNewChatProps = {
  userId: string;
  preferredModel: string;
};

export function ButtonNewChat({ userId, preferredModel }: ButtonNewChatProps) {
  const router = useRouter();

  const handleCreateNewChat = async () => {
    if (!userId) {
      return;
    }

    const newChatId = await createNewChat(userId, "new chat", preferredModel);
    router.push(`/c/${newChatId}`);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCreateNewChat}
          type="button"
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
        >
          <NotePencil size={24} />
        </button>
      </TooltipTrigger>
      <TooltipContent>New Chat</TooltipContent>
    </Tooltip>
  );
}
