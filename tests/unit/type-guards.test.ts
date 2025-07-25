import { describe, expect, it } from "vitest"

import type { ContentPart } from "@/app/types/api.types"
import {
  hasToolInvocation,
  isArtifactPart,
  isReasoningPart,
  isSourcePart,
  isToolInvocationPart,
  type MessagePart,
} from "@/lib/type-guards/message-parts"

describe("Message Part Type Guards", () => {
  describe("isArtifactPart", () => {
    it("should return true for valid artifact parts", () => {
      const artifactPart: ContentPart = {
        type: "artifact",
        artifact: {
          id: "art_123",
          type: "code",
          title: "Test Code",
          content: "console.log('test')",
          language: "javascript",
          metadata: {
            size: 20,
            lines: 1,
            created: "2024-01-15T10:30:00Z",
          },
        },
      }

      expect(isArtifactPart(artifactPart)).toBe(true)
    })

    it("should return false for non-artifact parts", () => {
      const textPart = { type: "text", text: "Hello world" }
      expect(isArtifactPart(textPart)).toBe(false)
    })

    it("should return false for artifact parts with null artifact", () => {
      const invalidArtifactPart = {
        type: "artifact" as const,
        artifact: null,
      }
      expect(isArtifactPart(invalidArtifactPart)).toBe(false)
    })

    it("should return false for artifact parts without artifact property", () => {
      const invalidArtifactPart = {
        type: "artifact" as const,
      }
      expect(isArtifactPart(invalidArtifactPart)).toBe(false)
    })
  })

  describe("isToolInvocationPart", () => {
    it("should return true for tool-invocation parts", () => {
      const toolPart = {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          step: 1,
          toolCallId: "call_123",
          toolName: "search",
          args: { query: "test" },
          result: { data: "result" },
        },
      }

      expect(isToolInvocationPart(toolPart)).toBe(true)
    })

    it("should return false for non-tool-invocation parts", () => {
      const textPart = { type: "text", text: "Hello world" }
      expect(isToolInvocationPart(textPart)).toBe(false)
    })
  })

  describe("isReasoningPart", () => {
    it("should return true for reasoning parts", () => {
      const reasoningPart = {
        type: "reasoning",
        reasoning: "I need to analyze this problem step by step...",
      }

      expect(isReasoningPart(reasoningPart)).toBe(true)
    })

    it("should return false for non-reasoning parts", () => {
      const textPart = { type: "text", text: "Hello world" }
      expect(isReasoningPart(textPart)).toBe(false)
    })

    it("should return false for reasoning parts without reasoning property", () => {
      const invalidReasoningPart = {
        type: "reasoning" as const,
      }
      expect(isReasoningPart(invalidReasoningPart)).toBe(false)
    })
  })

  describe("isSourcePart", () => {
    it("should return true for source parts", () => {
      const sourcePart = {
        type: "source",
        source: { url: "https://example.com", title: "Example" },
      }

      expect(isSourcePart(sourcePart)).toBe(true)
    })

    it("should return false for non-source parts", () => {
      const textPart = { type: "text", text: "Hello world" }
      expect(isSourcePart(textPart)).toBe(false)
    })
  })

  describe("hasToolInvocation", () => {
    it("should return true for parts with toolInvocation property", () => {
      const partWithTool = {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          step: 1,
          toolCallId: "call_123",
          toolName: "search",
        },
      }

      expect(hasToolInvocation(partWithTool)).toBe(true)
    })

    it("should return false for parts without toolInvocation property", () => {
      const textPart = { type: "text", text: "Hello world" }
      expect(hasToolInvocation(textPart)).toBe(false)
    })

    it("should return false for parts with null toolInvocation", () => {
      const partWithNullTool = {
        type: "tool-invocation" as const,
        toolInvocation: null,
      }
      expect(hasToolInvocation(partWithNullTool)).toBe(false)
    })
  })

  describe("Integration with mixed part arrays", () => {
    it("should correctly filter mixed arrays of message parts", () => {
      const mixedParts: MessagePart[] = [
        { type: "text", text: "Hello" },
        {
          type: "artifact",
          artifact: {
            id: "art_123",
            type: "code",
            title: "Test",
            content: "test code",
            metadata: { size: 9, created: "2024-01-15T10:30:00Z" },
          },
        },
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            step: 1,
            toolCallId: "call_123",
            toolName: "search",
          },
        },
        {
          type: "reasoning",
          reasoning: "Let me think about this...",
        },
        { type: "source", source: { url: "https://example.com" } },
      ]

      const artifactParts = mixedParts.filter(isArtifactPart)
      const toolParts = mixedParts.filter(isToolInvocationPart)
      const reasoningParts = mixedParts.filter(isReasoningPart)
      const sourceParts = mixedParts.filter(isSourcePart)

      expect(artifactParts).toHaveLength(1)
      expect(toolParts).toHaveLength(1)
      expect(reasoningParts).toHaveLength(1)
      expect(sourceParts).toHaveLength(1)

      // Type assertions should work correctly
      expect(artifactParts[0].artifact?.id).toBe("art_123")
      expect(toolParts[0].toolInvocation?.toolName).toBe("search")
      expect(reasoningParts[0].reasoning).toBe("Let me think about this...")
      expect(sourceParts[0].source.url).toBe("https://example.com")
    })
  })
})
