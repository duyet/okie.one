/**
 * Sequential Thinking MCP Server
 *
 * Provides step-by-step reasoning capabilities for AI models that don't have
 * native reasoning support. Based on official MCP Sequential Thinking Server.
 */

import type { ToolSet } from "ai"
import { addReasoningStepTool, sequentialThinkingTool } from "./tools"
import { SEQUENTIAL_THINKING_SYSTEM_PROMPT } from "./prompts"
import type {
  SequentialThinkingConfig,
  ThoughtHistoryEntry,
  BranchData,
  ThoughtData,
} from "./types"

export * from "./types"
export * from "./tools"
export * from "./prompts"

export class SequentialThinkingServer {
  private config: SequentialThinkingConfig
  private thoughtHistory: ThoughtHistoryEntry[] = []
  private branches: Map<string, BranchData> = new Map()
  private currentBranch: string | null = null

  constructor(config: SequentialThinkingConfig = {}) {
    this.config = {
      maxSteps: 15,
      disableThoughtLogging: false,
      ...config,
    }
  }

  /**
   * Get the tools provided by this MCP server
   */
  getTools(): ToolSet {
    return {
      // Official MCP Sequential Thinking tool
      sequentialthinking: sequentialThinkingTool as any,
      // Legacy tool for backward compatibility
      addReasoningStep: addReasoningStepTool as any,
    }
  }

  /**
   * Get the system prompt enhancement
   */
  getSystemPromptEnhancement(): string {
    return (
      this.config.systemPromptEnhancement || SEQUENTIAL_THINKING_SYSTEM_PROMPT
    )
  }

  /**
   * Get the maximum number of steps allowed
   */
  getMaxSteps(): number {
    return this.config.maxSteps || 15
  }

  /**
   * Check if Sequential Thinking is enabled
   */
  isEnabled(): boolean {
    return true
  }

  /**
   * Add a thought to the history (for tracking and branching)
   */
  addThoughtToHistory(thoughtData: ThoughtData): ThoughtHistoryEntry {
    if (this.config.disableThoughtLogging) {
      return {
        ...thoughtData,
        id: `thought-${Date.now()}`,
        timestamp: new Date(),
      }
    }

    const historyEntry: ThoughtHistoryEntry = {
      ...thoughtData,
      id: `thought-${this.thoughtHistory.length + 1}-${Date.now()}`,
      timestamp: new Date(),
    }

    this.thoughtHistory.push(historyEntry)

    // Handle branching
    if (thoughtData.branchFromThought && thoughtData.branchId) {
      this.createBranch(
        thoughtData.branchId,
        thoughtData.branchFromThought,
        thoughtData
      )
    }

    return historyEntry
  }

  /**
   * Create a new branch from a specific thought
   */
  private createBranch(
    branchId: string,
    branchPoint: number,
    initialThought: ThoughtData
  ): void {
    const branch: BranchData = {
      id: branchId,
      branchPoint,
      thoughts: [initialThought],
    }

    this.branches.set(branchId, branch)
    this.currentBranch = branchId
  }

  /**
   * Get the complete thought history
   */
  getThoughtHistory(): ThoughtHistoryEntry[] {
    return [...this.thoughtHistory]
  }

  /**
   * Get all branches
   */
  getBranches(): Map<string, BranchData> {
    return new Map(this.branches)
  }

  /**
   * Get the current active branch
   */
  getCurrentBranch(): string | null {
    return this.currentBranch
  }

  /**
   * Reset the thought history and branches
   */
  reset(): void {
    this.thoughtHistory = []
    this.branches.clear()
    this.currentBranch = null
  }

  /**
   * Get thoughts within a specific range
   */
  getThoughtsInRange(
    startThought: number,
    endThought: number
  ): ThoughtHistoryEntry[] {
    return this.thoughtHistory.filter(
      (entry) =>
        entry.thoughtNumber >= startThought && entry.thoughtNumber <= endThought
    )
  }

  /**
   * Find thoughts that reference a specific thought number
   */
  findReferencingThoughts(thoughtNumber: number): ThoughtHistoryEntry[] {
    return this.thoughtHistory.filter(
      (entry) =>
        entry.revisesThought === thoughtNumber ||
        entry.branchFromThought === thoughtNumber
    )
  }

  /**
   * Get statistics about the current thinking session
   */
  getStats(): {
    totalThoughts: number
    branches: number
    revisions: number
    maxThoughtNumber: number
  } {
    const revisions = this.thoughtHistory.filter(
      (entry) => entry.isRevision
    ).length
    const maxThoughtNumber = Math.max(
      ...this.thoughtHistory.map((entry) => entry.thoughtNumber),
      0
    )

    return {
      totalThoughts: this.thoughtHistory.length,
      branches: this.branches.size,
      revisions,
      maxThoughtNumber,
    }
  }
}

// Default export for convenience
export const sequentialThinkingServer = new SequentialThinkingServer()
