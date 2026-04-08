/**
 * Event Tracking API
 *
 * Provides functions for tracking and querying user engagement events
 * Works with the event_tracking table for analytics
 *
 * Note: The event_tracking table schema will be created by the database worker
 * These functions use RPC calls to avoid TypeScript type errors during development
 */

import { createClient } from "@/lib/supabase/server"
import { analyticsLogger } from "@/lib/logger"

export interface EventRecord {
  id: string
  user_id: string
  event_name: string
  event_properties?: Record<string, unknown>
  created_at: string
}

export interface DailyActiveUsers {
  date: string
  active_users: number
  new_users: number
  returning_users: number
}

export interface EventSummary {
  event_name: string
  count: number
  unique_users: number
}

export interface UserEventCount {
  user_id: string
  event_count: number
  first_event: string
  last_event: string
}

/**
 * Records an event for analytics tracking
 *
 * @param userId - User ID
 * @param eventName - Name of the event
 * @param properties - Optional event properties
 * @returns The created event record
 */
export async function trackEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
): Promise<EventRecord> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error("Database connection failed")
    }

    // Use RPC to insert event (bypasses TypeScript type checking)
    const { data, error } = await (supabase as any).rpc("track_event", {
      p_user_id: userId,
      p_event_name: eventName,
      p_event_properties: properties || null,
    })

    if (error) {
      throw new Error(`Failed to track event: ${error.message}`)
    }

    analyticsLogger.debug("Event tracked", {
      userId,
      eventName,
      properties,
    })

    return data as EventRecord
  } catch (error) {
    analyticsLogger.error("Error tracking event", {
      userId,
      eventName,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Gets daily active users for a date range
 *
 * @param daysBack - Number of days to look back (default: 30)
 * @returns Array of daily active user statistics
 */
export async function getDailyActiveUsers(
  daysBack: number = 30
): Promise<DailyActiveUsers[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error("Database connection failed")
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split("T")[0]

    const { data, error } = await (supabase as any).rpc(
      "get_daily_active_users",
      {
        start_date: startDateStr,
        days_back: daysBack,
      }
    )

    if (error) {
      throw new Error(`Failed to get daily active users: ${error.message}`)
    }

    return (data || []) as DailyActiveUsers[]
  } catch (error) {
    analyticsLogger.error("Error getting daily active users", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Gets event summary statistics for a date range
 *
 * @param daysBack - Number of days to look back (default: 7)
 * @returns Array of event summaries
 */
export async function getEventSummary(
  daysBack: number = 7
): Promise<EventSummary[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error("Database connection failed")
    }

    // Use RPC to get event summary
    const { data, error } = await (supabase as any).rpc("get_event_summary", {
      days_back: daysBack,
    })

    if (error) {
      throw new Error(`Failed to get event summary: ${error.message}`)
    }

    return (data || []) as EventSummary[]
  } catch (error) {
    analyticsLogger.error("Error getting event summary", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Gets top users by event count for a date range
 *
 * @param daysBack - Number of days to look back (default: 7)
 * @param limit - Maximum number of users to return (default: 10)
 * @returns Array of user event counts
 */
export async function getTopUsersByEvents(
  daysBack: number = 7,
  limit: number = 10
): Promise<UserEventCount[]> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error("Database connection failed")
    }

    // Use RPC to get top users by events
    const { data, error } = await (supabase as any).rpc("get_top_users_by_events", {
      days_back: daysBack,
      limit_count: limit,
    })

    if (error) {
      throw new Error(`Failed to get top users: ${error.message}`)
    }

    return (data || []) as UserEventCount[]
  } catch (error) {
    analyticsLogger.error("Error getting top users", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Gets user activity metrics for analytics
 *
 * @param userId - User ID to analyze
 * @param daysBack - Number of days to look back (default: 30)
 * @returns User activity statistics
 */
export async function getUserActivityMetrics(
  userId: string,
  daysBack: number = 30
): Promise<{
  totalEvents: number
  uniqueEventTypes: number
  firstEventDate: string | null
  lastEventDate: string | null
  averageEventsPerDay: number
}> {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error("Database connection failed")
    }

    // Use RPC to get user activity metrics
    const { data, error } = await (supabase as any).rpc("get_user_activity_metrics", {
      target_user_id: userId,
      days_back: daysBack,
    })

    if (error) {
      throw new Error(`Failed to get user activity: ${error.message}`)
    }

    return data as {
      totalEvents: number
      uniqueEventTypes: number
      firstEventDate: string | null
      lastEventDate: string | null
      averageEventsPerDay: number
    }
  } catch (error) {
    analyticsLogger.error("Error getting user activity metrics", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
