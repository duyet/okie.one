// Server-safe MCP configuration without React dependencies
// This file is used by server-side code that needs MCP defaults

export type McpServerConfigServer = {
  id: string
  name: string
  description: string
  requiresAuth?: boolean
  defaultEnabled: boolean
  category?: "reasoning" | "documentation" | "tools" | "other"
}

// Centralized MCP server configurations (server-safe)
export const MCP_SERVER_CONFIGS_SERVER: Record<string, McpServerConfigServer> =
  {
    "sequential-thinking": {
      id: "sequential-thinking",
      name: "Sequential Thinking MCP",
      description: "Advanced step-by-step reasoning for non-reasoning models",
      requiresAuth: true,
      defaultEnabled: true,
      category: "reasoning",
    },
    // Future servers can be easily added here
  } as const

// Type-safe server IDs
export type McpServerId = keyof typeof MCP_SERVER_CONFIGS_SERVER

// Helper functions for server-side use
export const getDefaultMcpSettings = (): Record<string, boolean> =>
  Object.fromEntries(
    Object.values(MCP_SERVER_CONFIGS_SERVER).map((server) => [
      server.id,
      server.defaultEnabled,
    ])
  )
