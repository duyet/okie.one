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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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

    // Delete chats
    await supabase.from("chats").delete().ilike("title", "%test%")

    // Note: We don't delete users as they might be needed for auth
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
    // Create test anonymous user if it doesn't exist
    const testUserId = getDefaultTestUserId() // Use proper UUID format

    // Note: In a real setup, you'd create this through Supabase auth
    // For testing, we'll create a user record directly
    const { error: userError } = await supabase.from("users").upsert({
      id: testUserId,
      email: "test-anonymous@example.com", // Placeholder email for anonymous test user
      created_at: new Date().toISOString(),
    })

    if (userError && userError.code !== "23505") {
      // Ignore duplicate key errors
      console.warn("⚠️ Failed to create test user:", userError)
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
  // Always use proper UUID format
  const userId = isAnonymous
    ? "00000000-0000-4000-8000-000000000001"
    : crypto.randomUUID()

  const user: TestUser = {
    id: userId,
    email: email || undefined,
    isAnonymous,
  }

  if (supabase) {
    try {
      const { error } = await supabase.from("users").upsert({
        id: userId,
        email: isAnonymous ? `test-anonymous-${userId}@example.com` : email,
        created_at: new Date().toISOString(),
      })

      if (error && error.code !== "23505") {
        console.warn("⚠️ Failed to create user in database:", error)
      } else {
        console.log(`✅ Created user in database: ${userId}`)
      }
    } catch (error) {
      console.warn("⚠️ Database user creation failed:", error)
    }
  }

  testUsers.set(userId, user)
  console.log(
    `📦 Created ${isAnonymous ? "anonymous" : "authenticated"} test user:`,
    userId
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
