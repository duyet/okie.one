import { notFound } from "next/navigation"

import { isSupabaseEnabled } from "@/lib/supabase/config"

import LoginPage from "./login-page"

export default function AuthPage() {
  if (!isSupabaseEnabled) {
    return notFound()
  }

  return <LoginPage />
}
