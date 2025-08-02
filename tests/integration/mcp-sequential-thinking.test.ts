/**
 * Integration tests for Sequential Thinking MCP Server
 */

import { describe, expect, it } from "vitest"

import {
  SEQUENTIAL_THINKING_SYSTEM_PROMPT,
  SequentialThinkingServer,
  sequentialThinkingServer,
} from "@/lib/mcp/servers/sequential-thinking"

describe("Sequential Thinking MCP Server", () => {
  describe("SequentialThinkingServer", () => {
    it("should create an instance with default configuration", () => {
      const server = new SequentialThinkingServer()

      expect(server.isEnabled()).toBe(true)
      expect(server.getMaxSteps()).toBe(15)
      expect(server.getSystemPromptEnhancement()).toBe(
        SEQUENTIAL_THINKING_SYSTEM_PROMPT
      )
    })

    it("should create an instance with custom configuration", () => {
      const server = new SequentialThinkingServer({
        maxSteps: 20,
        systemPromptEnhancement: "Custom prompt",
      })

      expect(server.getMaxSteps()).toBe(20)
      expect(server.getSystemPromptEnhancement()).toBe("Custom prompt")
    })

    it("should provide addReasoningStep tool", () => {
      const server = new SequentialThinkingServer()
      const tools = server.getTools()

      expect(tools).toHaveProperty("addReasoningStep")
      expect(tools.addReasoningStep).toHaveProperty("description")
      expect(tools.addReasoningStep).toHaveProperty("parameters")
      expect(tools.addReasoningStep).toHaveProperty("execute")
    })

    it("should execute addReasoningStep tool correctly", async () => {
      const server = new SequentialThinkingServer()
      const tools = server.getTools()

      const result = await tools.addReasoningStep?.execute?.(
        {
          title: "Test Step",
          content: "This is a test reasoning step",
          nextStep: "continue",
        },
        {
          toolCallId: "test-call-id",
          messages: [],
        }
      )

      expect(result).toBeDefined()

      expect(result).toHaveProperty("content")
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toHaveProperty("type", "text")

      const responseData = JSON.parse(result.content[0].text)
      expect(responseData).toEqual({
        title: "Test Step",
        content: "This is a test reasoning step",
        nextStep: "continue",
        status: "success",
        legacy: true,
      })
    })

    it("should handle missing parameters in addReasoningStep", async () => {
      const server = new SequentialThinkingServer()
      const tools = server.getTools()

      const result = await tools.addReasoningStep?.execute?.(
        {
          title: "",
          content: "",
          nextStep: "continue",
        },
        {
          toolCallId: "test-call-id-2",
          messages: [],
        }
      )

      expect(result).toBeDefined()

      expect(result).toHaveProperty("content")
      expect(result).toHaveProperty("isError", true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toHaveProperty("type", "text")

      const responseData = JSON.parse(result.content[0].text)
      expect(responseData).toHaveProperty(
        "error",
        "Missing required parameters: title and content are required"
      )
      expect(responseData).toHaveProperty("status", "failed")
    })

    it("should default nextStep to continue", async () => {
      const server = new SequentialThinkingServer()
      const tools = server.getTools()

      const result = await tools.addReasoningStep?.execute?.(
        {
          title: "Test Step",
          content: "Test content",
        },
        {
          toolCallId: "test-call-id-3",
          messages: [],
        }
      )

      expect(result).toBeDefined()

      expect(result).toHaveProperty("content")
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toHaveProperty("type", "text")

      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.nextStep).toBe("continue")
    })
  })

  describe("Default server instance", () => {
    it("should provide a default configured server", () => {
      expect(sequentialThinkingServer).toBeInstanceOf(SequentialThinkingServer)
      expect(sequentialThinkingServer.isEnabled()).toBe(true)
      expect(sequentialThinkingServer.getMaxSteps()).toBe(15)
    })
  })
})
