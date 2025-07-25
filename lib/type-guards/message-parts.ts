import type { ContentPart } from "@/app/types/api.types"

// Type guards for AI SDK message parts
export interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation?: {
    state: string
    step: number
    toolCallId: string
    toolName: string
    args?: any
    result?: any
  }
}

export interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

export interface SourcePart {
  type: "source"
  source: any
}

// Union type for all possible part types
export type MessagePart =
  | ContentPart
  | ToolInvocationPart
  | ReasoningPart
  | SourcePart
  | { type: "text"; text?: string }
  | { type: "file"; [key: string]: any }
  | { type: "step-start"; [key: string]: any }

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

export function isSourcePart(part: MessagePart): part is SourcePart {
  return part.type === "source"
}

export function hasToolInvocation(
  part: MessagePart
): part is MessagePart & { toolInvocation: any } {
  return "toolInvocation" in part && part.toolInvocation != null
}
