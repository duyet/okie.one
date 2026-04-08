/**
 * Event Tracking API
 *
 * Simple event tracking for user engagement analytics
 * Works with the user_events table created in the database migration
 */

import { createClient } from "@/lib/supabase/server"

export type EventType = "signup" | "login" | "chat_created" | "message_sent"

export interface EventMetadata {
  [key: string]: unknown
}

/**
 * Records an event for analytics tracking
 *
 * @param userId - User ID
 * @param eventType - Type of event
 * @param metadata - Optional event metadata
 */
export async function trackEvent(
  userId: string,
  eventType: EventType,
  metadata?: EventMetadata
): Promise<void> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      console.warn("Supabase not available, skipping event tracking")
      return
    }

    // Insert event into user_events table
    // Use type assertion since table doesn't exist in types until migration is deployed
    const { error } = await (supabase as any).from("user_events").insert({
      user_id: userId,
      event_type: eventType,
      event_metadata: metadata || null,
    })

    if (error) {
      // Log but don't throw - event tracking shouldn't block the app
      console.error("Event tracking failed:", error)
    }
  } catch (error) {
    // Non-blocking - log and continue
    console.error("Event tracking error:", error)
  }
}

/**
 * Tracks user signup event
 */
export async function trackSignup(
  userId: string,
  method: "google" | "email" | "anonymous"
): Promise<void> {
  return trackEvent(userId, "signup", { method })
}

/**
 * Tracks user login event
 */
export async function trackLogin(userId: string): Promise<void> {
  return trackEvent(userId, "login")
}

/**
 * Tracks chat creation event
 */
export async function trackChatCreated(
  userId: string,
  chatId: string,
  model: string
): Promise<void> {
  return trackEvent(userId, "chat_created", { chatId, model })
}

/**
 * Tracks message sent event
 */
export async function trackMessageSent(
  userId: string,
  chatId: string,
  model: string,
  tokenCount?: number
): Promise<void> {
  return trackEvent(userId, "message_sent", { chatId, model, tokenCount })
}
