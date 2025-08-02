"use client"

import { memo, useCallback } from "react"

import { Switch } from "@/components/ui/switch"
import type { McpServerConfig } from "@/lib/user-preference-store/mcp-config"
import { getAllMcpServerConfigs } from "@/lib/user-preference-store/mcp-config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"

// Memoized server item component for better performance
const McpServerItem = memo(function McpServerItem({
  server,
  isEnabled,
  onToggle,
}: {
  server: McpServerConfig
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  const IconComponent = server.icon

  return (
    <div
      className="flex items-center justify-between"
      data-testid="mcp-server-item"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <IconComponent className="size-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{server.name}</h3>
            {server.requiresAuth && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
                Auth Required
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{server.description}</p>
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${server.name}`}
      />
    </div>
  )
})

export function McpSettings() {
  const { setMcpServerEnabled, isMcpServerEnabled } = useUserPreferences()
  const servers = getAllMcpServerConfigs()

  const handleServerToggle = useCallback(
    (serverId: string) => (enabled: boolean) => {
      setMcpServerEnabled(serverId, enabled)
    },
    [setMcpServerEnabled]
  )

  if (servers.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <h2 className="font-semibold text-lg">MCP Servers</h2>
          <p className="text-muted-foreground text-sm">
            No MCP servers are currently configured.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-lg">MCP Servers</h2>
        <p className="text-muted-foreground text-sm">
          Enable or disable Model Context Protocol (MCP) servers that enhance AI
          capabilities with specialized tools and functions.
        </p>
      </div>

      {/* MCP Servers List */}
      <div className="space-y-4">
        {servers.map((server) => (
          <McpServerItem
            key={server.id}
            server={server}
            isEnabled={isMcpServerEnabled(server.id)}
            onToggle={handleServerToggle(server.id)}
          />
        ))}
      </div>
    </div>
  )
}
