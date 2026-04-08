interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const LIMIT = 10 // requests
const WINDOW = 10 * 1000 // 10 seconds in ms

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
 * @returns Object with allowed status and optional reset time in milliseconds
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  resetIn?: number
} {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  // No entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + WINDOW })
    return { allowed: true }
  }

  // Rate limit exceeded
  if (entry.count >= LIMIT) {
    return { allowed: false, resetIn: entry.resetTime - now }
  }

  // Increment counter
  entry.count++
  return { allowed: true }
}

/**
 * Generate a standardized rate limit response
 * @param resetIn - Time until rate limit resets in milliseconds
 * @returns Response object with 429 status and retry information
 */
export function rateLimitResponse(resetIn: number): Response {
  const retryAfter = Math.ceil(resetIn / 1000)
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  )
}

/**
 * Clean up expired rate limit entries
 * Useful for periodic cleanup to prevent memory leaks
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}
