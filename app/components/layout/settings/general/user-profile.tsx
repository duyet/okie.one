"use client"

import { User } from "@phosphor-icons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/lib/user-store/provider"

export function UserProfile() {
  const { user } = useUser()

  if (!user) return null

  return (
    <div>
      <h3 className="mb-3 font-medium text-sm">Profile</h3>
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center overflow-hidden rounded-full bg-muted">
          {user?.profile_image ? (
            <Avatar className="size-12">
              <AvatarImage src={user.profile_image} className="object-cover" />
              <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="size-12 text-muted-foreground" />
          )}
        </div>
        <div>
          <h4 className="font-medium text-sm">{user?.display_name}</h4>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </div>
    </div>
  )
}
