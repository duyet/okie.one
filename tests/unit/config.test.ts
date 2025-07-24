import { describe, expect, it } from "vitest"

import {
  AUTH_DAILY_MESSAGE_LIMIT,
  FREE_MODELS_IDS,
  MESSAGE_MAX_LENGTH,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
} from "@/lib/config"

describe("Config", () => {
  it("should have reasonable message length limits", () => {
    expect(MESSAGE_MAX_LENGTH).toBeGreaterThan(0)
    expect(MESSAGE_MAX_LENGTH).toBeLessThan(100000) // Reasonable upper bound
  })

  it("should have free models configured", () => {
    expect(FREE_MODELS_IDS).toBeInstanceOf(Array)
    expect(FREE_MODELS_IDS.length).toBeGreaterThan(0)
  })

  it("should have proper rate limits", () => {
    expect(NON_AUTH_DAILY_MESSAGE_LIMIT).toBeGreaterThan(0)
    expect(AUTH_DAILY_MESSAGE_LIMIT).toBeGreaterThan(0)
    expect(AUTH_DAILY_MESSAGE_LIMIT).toBeGreaterThan(
      NON_AUTH_DAILY_MESSAGE_LIMIT
    )
  })
})
