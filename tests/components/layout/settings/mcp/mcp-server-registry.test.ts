import { describe, expect, test } from "vitest"

import {
  getAllMcpServerConfigs,
  getDefaultMcpSettings,
  getMcpServerConfig,
  MCP_SERVER_CONFIGS,
} from "@/lib/user-preference-store/mcp-config"

describe("MCP Server Registry", () => {
  describe("MCP_SERVER_CONFIGS", () => {
    test("all servers have required fields", () => {
      const servers = Object.values(MCP_SERVER_CONFIGS)

      servers.forEach((server) => {
        expect(server).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          icon: expect.anything(),
          defaultEnabled: expect.any(Boolean),
        })

        // ID should be kebab-case
        expect(server.id).toMatch(/^[a-z0-9-]+$/)

        // Name should not be empty
        expect(server.name.trim()).toBeTruthy()

        // Description should not be empty
        expect(server.description.trim()).toBeTruthy()
      })
    })

    test("all server IDs are unique", () => {
      const ids = Object.keys(MCP_SERVER_CONFIGS)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    test("server names are unique", () => {
      const names = Object.values(MCP_SERVER_CONFIGS).map(
        (server) => server.name
      )
      const uniqueNames = new Set(names)

      expect(uniqueNames.size).toBe(names.length)
    })
  })

  describe("getMcpServerConfig", () => {
    test("returns undefined when ID does not exist", () => {
      const server = getMcpServerConfig("non-existent-server")

      expect(server).toBeUndefined()
    })

    test("handles empty string ID", () => {
      const server = getMcpServerConfig("")

      expect(server).toBeUndefined()
    })
  })

  describe("getAllMcpServerConfigs", () => {
    test("returns empty array when no servers configured", () => {
      const servers = getAllMcpServerConfigs()

      expect(servers).toHaveLength(0)
    })

    test("returns array of server configs", () => {
      const servers = getAllMcpServerConfigs()

      expect(Array.isArray(servers)).toBe(true)
    })
  })

  describe("getDefaultMcpSettings", () => {
    test("returns empty object when no servers configured", () => {
      const defaults = getDefaultMcpSettings()

      expect(defaults).toEqual({})
    })

    test("returns object with correct type", () => {
      const defaults = getDefaultMcpSettings()

      expect(typeof defaults).toBe("object")
      expect(defaults).not.toBeNull()

      Object.entries(defaults).forEach(([key, value]) => {
        expect(typeof key).toBe("string")
        expect(typeof value).toBe("boolean")
      })
    })
  })

  describe("server configuration validation", () => {
    test("server icons are valid React components", () => {
      Object.values(MCP_SERVER_CONFIGS).forEach((server) => {
        expect(server.icon).toBeTruthy()
        // Icons can be either functions or React components (objects with $$typeof)
        const isValidComponent =
          typeof server.icon === "function" ||
          (typeof server.icon === "object" &&
            server.icon !== null &&
            "$$typeof" in server.icon)
        expect(isValidComponent).toBe(true)
      })
    })

    test("optional properties have correct types when present", () => {
      Object.values(MCP_SERVER_CONFIGS).forEach((server) => {
        if (server.requiresAuth !== undefined) {
          expect(typeof server.requiresAuth).toBe("boolean")
        }

        if (server.category !== undefined) {
          expect(server.category).toMatch(
            /^(reasoning|documentation|tools|other)$/
          )
        }
      })
    })
  })

  describe("registry consistency", () => {
    test("getDefaultMcpSettings matches server configurations", () => {
      const defaults = getDefaultMcpSettings()

      Object.values(MCP_SERVER_CONFIGS).forEach((server) => {
        expect(defaults[server.id]).toBe(server.defaultEnabled)
      })
    })

    test("all servers can be retrieved by ID", () => {
      Object.values(MCP_SERVER_CONFIGS).forEach((server) => {
        const retrieved = getMcpServerConfig(server.id)
        expect(retrieved).toEqual(server)
      })
    })

    test("server IDs match their keys in the config object", () => {
      Object.entries(MCP_SERVER_CONFIGS).forEach(([key, server]) => {
        expect(server.id).toBe(key)
      })
    })
  })
})
