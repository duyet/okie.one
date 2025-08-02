import { getDefaultMcpSettings } from "./mcp-config-server"

export type LayoutType = "sidebar" | "fullscreen"

export type UserPreferences = {
  layout: LayoutType
  promptSuggestions: boolean
  showToolInvocations: boolean
  showConversationPreviews: boolean
  multiModelEnabled: boolean
  hiddenModels: string[]
  mcpSettings: Record<string, boolean>
}

export const defaultPreferences: UserPreferences = {
  layout: "fullscreen",
  promptSuggestions: true,
  showToolInvocations: true,
  showConversationPreviews: true,
  multiModelEnabled: false,
  hiddenModels: [],
  mcpSettings: getDefaultMcpSettings(),
}

// API format type definition
type ApiUserPreferences = {
  layout?: LayoutType | null
  prompt_suggestions?: boolean | null
  show_tool_invocations?: boolean | null
  show_conversation_previews?: boolean | null
  multi_model_enabled?: boolean | null
  hidden_models?: string[] | null
  mcp_settings?: Record<string, boolean> | null
}

import { validators } from "./preference-manager"

// Helper functions to convert between API format (snake_case) and frontend format (camelCase)
export function convertFromApiFormat(
  apiData: ApiUserPreferences
): UserPreferences {
  try {
    const layout = apiData.layout ?? defaultPreferences.layout
    const promptSuggestions =
      apiData.prompt_suggestions ?? defaultPreferences.promptSuggestions
    const showToolInvocations =
      apiData.show_tool_invocations ?? defaultPreferences.showToolInvocations
    const showConversationPreviews =
      apiData.show_conversation_previews ??
      defaultPreferences.showConversationPreviews
    const multiModelEnabled =
      apiData.multi_model_enabled ?? defaultPreferences.multiModelEnabled
    const hiddenModels =
      apiData.hidden_models ?? defaultPreferences.hiddenModels
    const mcpSettings = apiData.mcp_settings ?? defaultPreferences.mcpSettings

    // Validate converted data
    if (!validators.layout(layout)) {
      console.warn("Invalid layout value from API, using default:", layout)
    }
    if (!validators.stringArray(hiddenModels)) {
      console.warn(
        "Invalid hiddenModels value from API, using default:",
        hiddenModels
      )
    }
    if (!validators.mcpSettings(mcpSettings)) {
      console.warn(
        "Invalid mcpSettings value from API, using default:",
        mcpSettings
      )
    }

    return {
      layout: validators.layout(layout) ? layout : defaultPreferences.layout,
      promptSuggestions: validators.boolean(promptSuggestions)
        ? promptSuggestions
        : defaultPreferences.promptSuggestions,
      showToolInvocations: validators.boolean(showToolInvocations)
        ? showToolInvocations
        : defaultPreferences.showToolInvocations,
      showConversationPreviews: validators.boolean(showConversationPreviews)
        ? showConversationPreviews
        : defaultPreferences.showConversationPreviews,
      multiModelEnabled: validators.boolean(multiModelEnabled)
        ? multiModelEnabled
        : defaultPreferences.multiModelEnabled,
      hiddenModels: validators.stringArray(hiddenModels)
        ? hiddenModels
        : defaultPreferences.hiddenModels,
      mcpSettings: validators.mcpSettings(mcpSettings)
        ? mcpSettings
        : defaultPreferences.mcpSettings,
    }
  } catch (error) {
    console.error("Error converting from API format, using defaults:", error)
    return { ...defaultPreferences }
  }
}

export function convertToApiFormat(
  preferences: Partial<UserPreferences>
): ApiUserPreferences {
  const apiData: ApiUserPreferences = {}

  // Only include defined values to avoid sending null/undefined
  const entries = Object.entries(preferences) as Array<
    [keyof UserPreferences, UserPreferences[keyof UserPreferences]]
  >

  for (const [key, value] of entries) {
    if (value === undefined) continue

    switch (key) {
      case "layout":
        if (validators.layout(value)) apiData.layout = value
        break
      case "promptSuggestions":
        if (validators.boolean(value)) apiData.prompt_suggestions = value
        break
      case "showToolInvocations":
        if (validators.boolean(value)) apiData.show_tool_invocations = value
        break
      case "showConversationPreviews":
        if (validators.boolean(value))
          apiData.show_conversation_previews = value
        break
      case "multiModelEnabled":
        if (validators.boolean(value)) apiData.multi_model_enabled = value
        break
      case "hiddenModels":
        if (validators.stringArray(value)) apiData.hidden_models = value
        break
      case "mcpSettings":
        if (validators.mcpSettings(value)) apiData.mcp_settings = value
        break
    }
  }

  return apiData
}
