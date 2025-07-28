import { describe, expect, test } from "vitest"

import {
  convertFromApiFormat,
  convertToApiFormat,
  defaultPreferences,
  type UserPreferences,
} from "@/lib/user-preference-store/utils"

describe("UserPreferences utils", () => {
  describe("defaultPreferences", () => {
    test("includes mcpSettings with sequential-thinking enabled by default", () => {
      expect(defaultPreferences.mcpSettings).toEqual({
        "sequential-thinking": true,
      })
    })

    test("has all required fields", () => {
      expect(defaultPreferences).toMatchObject({
        layout: "fullscreen",
        promptSuggestions: true,
        showToolInvocations: true,
        showConversationPreviews: true,
        multiModelEnabled: false,
        hiddenModels: [],
        mcpSettings: expect.any(Object),
      })
    })
  })

  describe("convertFromApiFormat", () => {
    test("converts API format to UserPreferences format", () => {
      const apiData = {
        layout: "sidebar" as const,
        prompt_suggestions: false,
        show_tool_invocations: false,
        show_conversation_previews: false,
        multi_model_enabled: true,
        hidden_models: ["model1", "model2"],
        mcp_settings: {
          "sequential-thinking": false,
          "future-server": true,
        },
      }

      const result = convertFromApiFormat(apiData)

      expect(result).toEqual({
        layout: "sidebar",
        promptSuggestions: false,
        showToolInvocations: false,
        showConversationPreviews: false,
        multiModelEnabled: true,
        hiddenModels: ["model1", "model2"],
        mcpSettings: {
          "sequential-thinking": false,
          "future-server": true,
        },
      })
    })

    test("uses default values for missing fields", () => {
      const apiData = {}

      const result = convertFromApiFormat(apiData)

      expect(result).toEqual({
        layout: "fullscreen",
        promptSuggestions: true,
        showToolInvocations: true,
        showConversationPreviews: true,
        multiModelEnabled: false,
        hiddenModels: [],
        mcpSettings: { "sequential-thinking": true },
      })
    })

    test("handles null values", () => {
      const apiData = {
        layout: null,
        prompt_suggestions: null,
        show_tool_invocations: null,
        show_conversation_previews: null,
        multi_model_enabled: null,
        hidden_models: null,
        mcp_settings: null,
      }

      const result = convertFromApiFormat(apiData)

      expect(result).toEqual(defaultPreferences)
    })

    test("handles partial mcp_settings", () => {
      const apiData = {
        mcp_settings: {
          "sequential-thinking": false,
        },
      }

      const result = convertFromApiFormat(apiData)

      expect(result.mcpSettings).toEqual({
        "sequential-thinking": false,
      })
    })
  })

  describe("convertToApiFormat", () => {
    test("converts UserPreferences to API format", () => {
      const preferences: Partial<UserPreferences> = {
        layout: "sidebar",
        promptSuggestions: false,
        showToolInvocations: false,
        showConversationPreviews: false,
        multiModelEnabled: true,
        hiddenModels: ["model1", "model2"],
        mcpSettings: {
          "sequential-thinking": false,
          "future-server": true,
        },
      }

      const result = convertToApiFormat(preferences)

      expect(result).toEqual({
        layout: "sidebar",
        prompt_suggestions: false,
        show_tool_invocations: false,
        show_conversation_previews: false,
        multi_model_enabled: true,
        hidden_models: ["model1", "model2"],
        mcp_settings: {
          "sequential-thinking": false,
          "future-server": true,
        },
      })
    })

    test("only includes defined fields", () => {
      const preferences: Partial<UserPreferences> = {
        layout: "fullscreen",
        mcpSettings: {
          "sequential-thinking": true,
        },
      }

      const result = convertToApiFormat(preferences)

      expect(result).toEqual({
        layout: "fullscreen",
        mcp_settings: {
          "sequential-thinking": true,
        },
      })
    })

    test("handles empty mcpSettings", () => {
      const preferences: Partial<UserPreferences> = {
        mcpSettings: {},
      }

      const result = convertToApiFormat(preferences)

      expect(result).toEqual({
        mcp_settings: {},
      })
    })

    test("handles undefined mcpSettings", () => {
      const preferences: Partial<UserPreferences> = {
        layout: "sidebar",
      }

      const result = convertToApiFormat(preferences)

      expect(result).toEqual({
        layout: "sidebar",
      })
    })
  })

  describe("round-trip conversion", () => {
    test("preserves data through convertToApiFormat and convertFromApiFormat", () => {
      const originalPreferences: UserPreferences = {
        layout: "sidebar",
        promptSuggestions: false,
        showToolInvocations: true,
        showConversationPreviews: false,
        multiModelEnabled: true,
        hiddenModels: ["model1"],
        mcpSettings: {
          "sequential-thinking": false,
          "custom-server": true,
        },
      }

      const apiFormat = convertToApiFormat(originalPreferences)
      const roundTripResult = convertFromApiFormat(apiFormat)

      expect(roundTripResult).toEqual(originalPreferences)
    })
  })
})
