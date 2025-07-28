import { BrainIcon } from "@phosphor-icons/react"
import type { ComponentType } from "react"

export type McpServerConfig = {
  id: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
  requiresAuth?: boolean
  defaultEnabled: boolean
  category?: "reasoning" | "documentation" | "tools" | "other"
}

// Centralized MCP server configurations
export const MCP_SERVER_CONFIGS: Record<string, McpServerConfig> = {
  "sequential-thinking": {
    id: "sequential-thinking",
    name: "Sequential Thinking MCP",
    description: "Advanced step-by-step reasoning for non-reasoning models",
    icon: BrainIcon,
    requiresAuth: true,
    defaultEnabled: true,
    category: "reasoning",
  },
  // Future servers can be easily added here
  // 'context7': {
  //   id: "context7",
  //   name: "Context7 MCP",
  //   description: "Official library documentation and code examples",
  //   icon: BookIcon,
  //   requiresAuth: false,
  //   defaultEnabled: false,
  //   category: 'documentation',
  // },
} as const

// Type-safe server IDs
export type McpServerId = keyof typeof MCP_SERVER_CONFIGS

// Helper functions
export const getMcpServerConfig = (id: string): McpServerConfig | undefined =>
  MCP_SERVER_CONFIGS[id as McpServerId]

export const getAllMcpServerConfigs = (): McpServerConfig[] =>
  Object.values(MCP_SERVER_CONFIGS)

export const getDefaultMcpSettings = (): Record<string, boolean> =>
  Object.fromEntries(
    Object.values(MCP_SERVER_CONFIGS).map((server) => [
      server.id,
      server.defaultEnabled,
    ])
  )

export const getMcpServersByCategory = (
  category: McpServerConfig["category"]
) =>
  Object.values(MCP_SERVER_CONFIGS).filter(
    (server) => server.category === category
  )

// Constants for type safety
export const MCP_SERVER_IDS = {
  SEQUENTIAL_THINKING: "sequential-thinking" as const,
  // Add future server IDs here
} as const
