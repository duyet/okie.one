import type { Database } from "@/app/types/database.types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isSupabaseEnabled } from "./config"

export const createClient = async () => {
  if (!isSupabaseEnabled) {
    return null
  }

  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // ignore for middleware
          }
        },
      },
    }
  )
}
