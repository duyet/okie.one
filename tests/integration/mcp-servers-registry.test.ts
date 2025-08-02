/**
 * Integration tests for MCP Servers Registry
 */

import { describe, expect, it } from "vitest"

import {
  getMCPServer,
  getMCPServerNames,
  hasMCPServer,
  mcpServers,
  SequentialThinkingServer,
  sequentialThinkingServer,
} from "@/lib/mcp/servers"

describe("MCP Servers Registry", () => {
  describe("getMCPServer", () => {
    it("should return Sequential Thinking server for valid name", () => {
      const server = getMCPServer("server-sequential-thinking")

      expect(server).toBeInstanceOf(SequentialThinkingServer)
      expect(server).toBe(sequentialThinkingServer)
    })

    it("should return null for invalid server name", () => {
      const server = getMCPServer("nonexistent-server" as never)

      expect(server).toBeNull()
    })
  })

  describe("hasMCPServer", () => {
    it("should return true for existing server", () => {
      expect(hasMCPServer("server-sequential-thinking")).toBe(true)
    })

    it("should return false for non-existing server", () => {
      expect(hasMCPServer("nonexistent-server")).toBe(false)
    })
  })

  describe("getMCPServerNames", () => {
    it("should return array of available server names", () => {
      const names = getMCPServerNames()

      expect(names).toBeInstanceOf(Array)
      expect(names).toContain("server-sequential-thinking")
      expect(names.length).toBeGreaterThan(0)
    })
  })

  describe("mcpServers registry", () => {
    it("should contain Sequential Thinking server", () => {
      expect(mcpServers).toHaveProperty("server-sequential-thinking")
      expect(mcpServers["server-sequential-thinking"]).toBeInstanceOf(
        SequentialThinkingServer
      )
    })

    it("should have consistent server instances", () => {
      expect(mcpServers["server-sequential-thinking"]).toBe(
        sequentialThinkingServer
      )
    })
  })
})
