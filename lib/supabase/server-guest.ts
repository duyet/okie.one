import type { Database } from "@/app/types/database.types"
import { createServerClient } from "@supabase/ssr"
import { isSupabaseEnabled } from "./config"

export async function createGuestServerClient() {
  if (!isSupabaseEnabled) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error("Missing Supabase environment variables")
  }
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceRole,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
