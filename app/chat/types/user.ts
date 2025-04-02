import type { Tables } from "@/app/chat/types/database.types"

export type UserProfile = {
  avatar_url: string
  name: string
} & Tables<"users">
