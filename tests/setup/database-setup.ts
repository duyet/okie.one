/**
 * Database setup for E2E tests
 * Handles test database initialization, cleanup, and mock data creation
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export interface TestUser {
  id: string
  email?: string
  isAnonymous: boolean
}

export interface TestChat {
  id: string
  user_id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

// In-memory storage for test data when database is not available
const testUsers: Map<string, TestUser> = new Map()
const testChats: Map<string, TestChat> = new Map()
const testMessages: Map<string, Record<string, unknown>[]> = new Map()

/**
 * Initialize test database and create required test data
 */
export async function initializeTestDatabase(): Promise<{
  supabase: SupabaseClient | null
  testMode: boolean
}> {
  console.log("🧪 Initializing test database...")

  // Check if we should use real Supabase or mock mode
  const useRealDatabase = process.env.SKIP_DATABASE_OPERATIONS !== "true"

  if (!useRealDatabase) {
    console.log("📦 Using mock database mode for tests")
    return { supabase: null, testMode: true }
  }

  try {
    // Try to connect to Supabase (local or test instance)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
    }

    // Use service role key for admin operations if available, otherwise use anon key
    const serviceKey = supabaseServiceKey || supabaseAnonKey
    if (!serviceKey) {
      throw new Error("Missing Supabase service role key or anon key")
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Test connection
    const { error } = await supabase.from("users").select("count").limit(1)

    if (error) {
      console.warn(
        "⚠️ Database connection failed, falling back to mock mode:",
        error.message
      )
      return { supabase: null, testMode: true }
    }

    console.log("✅ Connected to test database")

    // Clean up existing test data
    await cleanupTestData(supabase)

    // Create test users and base data
    await createTestData(supabase)

    return { supabase, testMode: false }
  } catch (error) {
    console.warn("⚠️ Database setup failed, using mock mode:", error)
    return { supabase: null, testMode: true }
  }
}

/**
 * Clean up test data from database
 */
async function cleanupTestData(supabase: SupabaseClient): Promise<void> {
  console.log("🧹 Cleaning up test data...")

  try {
    // Delete messages first (foreign key constraints)
    await supabase.from("messages").delete().ilike("content", "%test%")
    await supabase.from("messages").delete().eq("user_id", getDefaultTestUserId())

    // Delete chats
    await supabase.from("chats").delete().ilike("title", "%test%")
    await supabase.from("chats").delete().eq("user_id", getDefaultTestUserId())

    // Clean up test users from public.users table
    const { data: testUsers } = await supabase
      .from("users")
      .select("id")
      .or(`email.ilike.%test%,email.ilike.%example.com`)

    if (testUsers && testUsers.length > 0) {
      const userIds = testUsers.map(user => user.id)
      await supabase.from("users").delete().in("id", userIds)
      console.log(`🗑️ Deleted ${userIds.length} test users from public.users`)
    }

    // Clean up auth users (requires admin privileges)
    try {
      const testUserIds = [
        getDefaultTestUserId(),
        "00000000-0000-4000-8000-000000000001"
      ]

      for (const userId of testUserIds) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId)
          if (authUser?.user?.email?.includes("test") || authUser?.user?.email?.includes("example.com")) {
            await supabase.auth.admin.deleteUser(userId)
            console.log(`🗑️ Deleted auth user: ${userId}`)
          }
        } catch (error) {
          // Ignore errors for users that don't exist
          if ((error as any)?.status !== 404) {
            console.log(`⚠️ Could not delete auth user ${userId}:`, error)
          }
        }
      }

      // Clean up by email pattern for any other test users
      const { data: allAuthUsers } = await supabase.auth.admin.listUsers()
      if (allAuthUsers?.users) {
        for (const user of allAuthUsers.users) {
          if (user.email?.includes("test") || user.email?.includes("example.com")) {
            try {
              await supabase.auth.admin.deleteUser(user.id)
              console.log(`🗑️ Deleted auth user by email: ${user.email}`)
            } catch (error) {
              console.log(`⚠️ Could not delete auth user ${user.id}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.log("⚠️ Auth user cleanup failed (non-critical):", error)
    }

    console.log("✅ Test data cleanup completed")
  } catch (error) {
    console.warn("⚠️ Test data cleanup failed:", error)
  }
}

/**
 * Create required test data
 */
async function createTestData(supabase: SupabaseClient): Promise<void> {
  console.log("🏗️ Creating test data...")

  try {
    // Generate a unique email for this test run to avoid conflicts
    const timestamp = Date.now()
    const testEmail = `test-anonymous-${timestamp}@example.com`
    let actualUserId = getDefaultTestUserId()

    // First, check if user exists in auth.users
    const { data: authUser, error: authCheckError } =
      await supabase.auth.admin.getUserById(actualUserId)

    if (authCheckError && (authCheckError as any).status !== 404) {
      console.warn("⚠️ Error checking auth user:", authCheckError)
    }

    if (!authUser?.user) {
      // Create auth user first (this creates the foreign key reference)
      const { data: newAuthUser, error: createAuthError } =
        await supabase.auth.admin.createUser({
          email: testEmail,
          email_confirm: true,
          user_metadata: {
            test_user: true,
            is_anonymous: true,
            created_at: new Date().toISOString(),
          },
        })

      if (createAuthError) {
        if (createAuthError.code === 'email_exists') {
          console.log("🔄 Auth user with email already exists, generating new email...")
          // Try with a new unique email
          const newEmail = `test-anonymous-${timestamp}-${Math.random().toString(36).substr(2, 9)}@example.com`
          const { data: retryAuthUser, error: retryError } =
            await supabase.auth.admin.createUser({
              email: newEmail,
              email_confirm: true,
              user_metadata: {
                test_user: true,
                is_anonymous: true,
                created_at: new Date().toISOString(),
              },
            })

          if (retryError) {
            console.warn("⚠️ Failed to create auth user after retry:", retryError)
            return // Skip user creation if auth fails
          } else if (retryAuthUser.user?.id) {
            actualUserId = retryAuthUser.user.id
            console.log("✅ Created auth user with new email:", actualUserId)
          }
        } else {
          console.warn("⚠️ Failed to create auth user:", createAuthError)
          return // Skip user creation if auth fails
        }
      } else if (newAuthUser.user?.id) {
        actualUserId = newAuthUser.user.id
        console.log("✅ Created auth user:", actualUserId)
      }
    } else {
      console.log("✅ Auth user already exists:", actualUserId)
    }

    // Now create/update the user record in public.users
    // Only proceed if we have a valid auth user
    const { data: finalAuthUser } = await supabase.auth.admin.getUserById(actualUserId)
    if (finalAuthUser?.user) {
      const { error: userError } = await supabase.from("users").upsert({
        id: actualUserId,
        email: finalAuthUser.user.email || testEmail,
        created_at: new Date().toISOString(),
      })

      if (userError && userError.code !== "23505") {
        // Ignore duplicate key errors
        console.warn("⚠️ Failed to create test user:", userError)
      } else {
        console.log("✅ Created/updated test user in public.users")
      }
    } else {
      console.warn("⚠️ Cannot create public.users record without valid auth user")
    }

    console.log("✅ Test data creation completed")
  } catch (error) {
    console.warn("⚠️ Test data creation failed:", error)
  }
}

/**
 * Create a test chat record
 */
export async function createTestChat(
  supabase: SupabaseClient | null,
  userId: string,
  title = "Test Chat",
  model = "gpt-4.1-nano"
): Promise<TestChat> {
  const chatId = crypto.randomUUID()
  const now = new Date().toISOString()

  const chat: TestChat = {
    id: chatId,
    user_id: userId,
    title,
    model,
    created_at: now,
    updated_at: now,
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert(chat)
        .select()
        .single()

      if (error) {
        console.warn("⚠️ Failed to create chat in database, using mock:", error)
        testChats.set(chatId, chat)
        return chat
      }

      return data
    } catch (error) {
      console.warn("⚠️ Database chat creation failed, using mock:", error)
    }
  }

  // Fallback to in-memory storage
  testChats.set(chatId, chat)
  console.log("📦 Created mock chat:", chatId)
  return chat
}

/**
 * Create a test user (anonymous by default)
 */
export async function createTestUser(
  supabase: SupabaseClient | null,
  isAnonymous = true,
  email?: string
): Promise<TestUser> {
  // Generate unique userId for non-anonymous users to avoid conflicts
  const userId = isAnonymous
    ? getDefaultTestUserId()
    : crypto.randomUUID()
  let actualUserId = userId

  // Generate unique email to avoid conflicts
  const timestamp = Date.now()
  const baseEmail = isAnonymous
    ? `test-anonymous-${timestamp}@example.com`
    : email || `test-${timestamp}@example.com`

  const user: TestUser = {
    id: userId,
    email: baseEmail,
    isAnonymous,
  }

  if (supabase) {
    try {
      // First check if auth user exists
      const { data: authUser, error: authCheckError } =
        await supabase.auth.admin.getUserById(userId)

      if (authCheckError && (authCheckError as any).status !== 404) {
        console.warn(`⚠️ Error checking auth user ${userId}:`, authCheckError)
      }

      if (!authUser?.user) {
        // Create auth user first if it doesn't exist
        const { data: newAuthUser, error: createAuthError } =
          await supabase.auth.admin.createUser({
            email: baseEmail,
            email_confirm: true,
            user_metadata: {
              test_user: true,
              is_anonymous: isAnonymous,
              created_at: new Date().toISOString(),
            },
          })

        if (createAuthError) {
          if (createAuthError.code === 'email_exists') {
            console.log(`🔄 Auth user with email already exists for ${userId}, generating new email...`)
            // Try with a new unique email
            const newEmail = `test-${isAnonymous ? 'anonymous' : 'user'}-${timestamp}-${Math.random().toString(36).substr(2, 9)}@example.com`
            const { data: retryAuthUser, error: retryError } =
              await supabase.auth.admin.createUser({
                email: newEmail,
                email_confirm: true,
                user_metadata: {
                  test_user: true,
                  is_anonymous: isAnonymous,
                  created_at: new Date().toISOString(),
                },
              })

            if (retryError) {
              console.warn(`⚠️ Failed to create auth user after retry ${userId}:`, retryError)
              return user // Return user with original ID but no database record
            } else if (retryAuthUser.user?.id) {
              actualUserId = retryAuthUser.user.id
              user.email = newEmail
              console.log(`✅ Created auth user with new email: ${actualUserId}`)
            }
          } else {
            console.warn(`⚠️ Failed to create auth user ${userId}:`, createAuthError)
            return user // Return user with original ID but no database record
          }
        } else if (newAuthUser.user?.id) {
          actualUserId = newAuthUser.user.id
          console.log(`✅ Created auth user: ${actualUserId}`)
        }
      } else {
        console.log(`✅ Auth user already exists: ${actualUserId}`)
        user.email = authUser.user.email || baseEmail
      }

      // Now create/update the user in public.users
      // Only proceed if we have a valid auth user
      const { data: finalAuthUser } = await supabase.auth.admin.getUserById(actualUserId)
      if (finalAuthUser?.user) {
        const { error } = await supabase.from("users").upsert({
          id: actualUserId,
          email: finalAuthUser.user.email || user.email,
          created_at: new Date().toISOString(),
        })

        if (error && error.code !== "23505") {
          console.warn("⚠️ Failed to create user in database:", error)
        } else {
          console.log(`✅ Created user in database: ${actualUserId}`)
        }
      } else {
        console.warn(`⚠️ Cannot create public.users record without valid auth user for ${actualUserId}`)
      }
    } catch (error) {
      console.warn("⚠️ Database user creation failed:", error)
    }
  }

  // Update user object with actual ID
  user.id = actualUserId

  testUsers.set(actualUserId, user)
  console.log(
    `📦 Created ${isAnonymous ? "anonymous" : "authenticated"} test user:`,
    actualUserId
  )
  return user
}

/**
 * Get test chat by ID (from database or mock)
 */
export async function getTestChat(
  supabase: SupabaseClient | null,
  chatId: string
): Promise<TestChat | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single()

      if (!error && data) {
        return data
      }
    } catch (error) {
      console.warn("⚠️ Database chat fetch failed:", error)
    }
  }

  return testChats.get(chatId) || null
}

/**
 * Reset all test data (for cleanup between tests)
 */
export async function resetTestData(
  supabase: SupabaseClient | null
): Promise<void> {
  console.log("🔄 Resetting test data...")

  // Clear in-memory storage
  testUsers.clear()
  testChats.clear()
  testMessages.clear()

  // Clean database if available
  if (supabase) {
    await cleanupTestData(supabase)
  }

  console.log("✅ Test data reset completed")
}

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  return process.env.NODE_ENV === "test" || process.env.TEST_MODE === "true"
}

/**
 * Get default test user ID for anonymous users
 */
export function getDefaultTestUserId(): string {
  return "00000000-0000-4000-8000-000000000001"
}
