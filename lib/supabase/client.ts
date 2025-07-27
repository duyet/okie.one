import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/app/types/database.types"

import { isSupabaseEnabledClient } from "./config"

export function createClient() {
  if (!isSupabaseEnabledClient) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
