import type { ContentPart } from "@/app/types/api.types"

// Type guards for AI SDK message parts
export interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation?: {
    state: string
    step?: number
    toolCallId?: string
    toolName?: string
    args?: Record<string, unknown>
    result?: unknown
  }
}

export interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

export interface SequentialReasoningStepPart {
  type: "sequential-reasoning-step"
  step: {
    title: string
    content: string
    nextStep?: "continue" | "finalAnswer"
  }
}

export interface SourcePart {
  type: "source"
  source: {
    url?: string
    title?: string
    [key: string]: unknown
  }
}

// Union type for all possible part types
export type MessagePart =
  | ContentPart
  | ToolInvocationPart
  | ReasoningPart
  | SequentialReasoningStepPart
  | SourcePart
  | { type: "text"; text?: string }
  | { type: "file"; [key: string]: unknown }
  | { type: "step-start"; [key: string]: unknown }
  | { type: string; [key: string]: unknown } // Fallback for AI SDK compatibility - consider narrowing based on actual usage

// Type guards
export function isArtifactPart(part: MessagePart): part is ContentPart {
  return part.type === "artifact" && "artifact" in part && part.artifact != null
}

export function isToolInvocationPart(
  part: MessagePart
): part is ToolInvocationPart {
  return part.type === "tool-invocation"
}

export function isReasoningPart(part: MessagePart): part is ReasoningPart {
  return part.type === "reasoning" && "reasoning" in part
}

export function isSequentialReasoningStepPart(
  part: MessagePart
): part is SequentialReasoningStepPart {
  return part.type === "sequential-reasoning-step" && "step" in part
}

export function isSourcePart(part: MessagePart): part is SourcePart {
  return part.type === "source"
}

export function hasToolInvocation(part: MessagePart): part is MessagePart & {
  toolInvocation: NonNullable<Record<string, unknown>>
} {
  return (
    "toolInvocation" in part &&
    part.toolInvocation != null &&
    typeof part.toolInvocation === "object"
  )
}
