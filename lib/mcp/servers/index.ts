/**
 * MCP Servers Registry
 *
 * Central registry for all MCP servers in the application.
 * Add more MCP servers here as they are implemented.
 */

export type MCPServerRegistry = {}

export const mcpServers: MCPServerRegistry = {}

/**
 * Get an MCP server by name
 */
export function getMCPServer<K extends keyof MCPServerRegistry>(
  name: K
): MCPServerRegistry[K] | null {
  return mcpServers[name] || null
}

/**
 * Check if an MCP server exists
 */
export function hasMCPServer(name: string): name is keyof MCPServerRegistry {
  return name in mcpServers
}

/**
 * Get all available MCP server names
 */
export function getMCPServerNames(): Array<keyof MCPServerRegistry> {
  return Object.keys(mcpServers) as Array<keyof MCPServerRegistry>
}
