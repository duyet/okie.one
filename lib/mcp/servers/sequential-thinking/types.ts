/**
 * Sequential Thinking MCP Server Types
 * Based on official MCP Sequential Thinking Server implementation
 */

// Official MCP Sequential Thinking types
export interface ThoughtData {
  thought: string
  thoughtNumber: number
  totalThoughts: number
  nextThoughtNeeded: boolean
  isRevision?: boolean
  revisesThought?: number
  branchFromThought?: number
  branchId?: string
  needsMoreThoughts?: boolean
}

export interface SequentialThinkingParams {
  thought: string
  nextThoughtNeeded: boolean
  thoughtNumber: number
  totalThoughts: number
  isRevision?: boolean
  revisesThought?: number
  branchFromThought?: number
  branchId?: string
  needsMoreThoughts?: boolean
}

export interface SequentialThinkingResult {
  content: Array<{ type: string; text: string }>
  isError?: boolean
}

export interface SequentialThinkingConfig {
  maxSteps?: number
  systemPromptEnhancement?: string
  disableThoughtLogging?: boolean
}

// Legacy types for backward compatibility
export interface ReasoningStep {
  title: string
  content: string
  nextStep?: "continue" | "finalAnswer"
}

export interface ReasoningStepParams {
  title: string
  content: string
  nextStep?: "continue" | "finalAnswer"
}

// Thought history and branching
export interface ThoughtHistoryEntry extends ThoughtData {
  timestamp: Date
  id: string
}

export interface BranchData {
  id: string
  branchPoint: number
  thoughts: ThoughtData[]
}
