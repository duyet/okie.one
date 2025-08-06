/**
 * Sequential Thinking MCP Server Tools
 * Based on official MCP Sequential Thinking Server implementation
 */

import { z } from "zod"

import type {
  ReasoningStepParams,
  SequentialThinkingParams,
  SequentialThinkingResult,
  ThoughtData,
} from "./types"

/**
 * Official MCP Sequential Thinking Tool
 */
export const sequentialThinkingTool = {
  name: "sequentialthinking",
  parameters: z.object({
    thought: z.string().describe("Your current thinking step"),
    nextThoughtNeeded: z
      .boolean()
      .describe("Whether another thought step is needed"),
    thoughtNumber: z.number().int().min(1).describe("Current thought number"),
    totalThoughts: z
      .number()
      .int()
      .min(1)
      .describe("Estimated total thoughts needed"),
    isRevision: z
      .boolean()
      .default(false)
      .describe("Whether this revises previous thinking"),
    revisesThought: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Which thought is being reconsidered"),
    branchFromThought: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Branching point thought number"),
    branchId: z.string().optional().describe("Branch identifier"),
    needsMoreThoughts: z
      .boolean()
      .default(false)
      .describe("If more thoughts are needed"),
  }),
  description: `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include:
  * Regular analytical steps
  * Revisions of previous thoughts
  * Questions about previous decisions
  * Realizations about needing more analysis
  * Changes in approach
  * Hypothesis generation
  * Hypothesis verification
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached`,
  execute: async (
    params: SequentialThinkingParams,
    context?: {
      server?: {
        addThoughtToHistory: (data: ThoughtData) => {
          id: string
          timestamp: Date
        }
      }
    }
  ): Promise<SequentialThinkingResult> => {
    try {
      console.log(
        "🧠 sequentialthinking called with:",
        JSON.stringify(params, null, 2)
      )

      const validatedInput = validateThoughtData(params)

      // Adjust total thoughts if current exceeds it
      if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
        validatedInput.totalThoughts = validatedInput.thoughtNumber
      }

      // Add to thought history if server context is available
      let historyEntry = null
      if (
        context?.server &&
        typeof context.server.addThoughtToHistory === "function"
      ) {
        try {
          historyEntry = context.server.addThoughtToHistory(validatedInput)
          console.log("📊 Added thought to history:", historyEntry.id)
        } catch (historyError) {
          console.warn("⚠️ Failed to add thought to history:", historyError)
        }
      }

      // Format the response according to official MCP standards
      const response = {
        thoughtNumber: validatedInput.thoughtNumber,
        totalThoughts: validatedInput.totalThoughts,
        nextThoughtNeeded: validatedInput.nextThoughtNeeded,
        thought: validatedInput.thought,
        isRevision: validatedInput.isRevision,
        revisesThought: validatedInput.revisesThought,
        branchFromThought: validatedInput.branchFromThought,
        branchId: validatedInput.branchId,
        needsMoreThoughts: validatedInput.needsMoreThoughts,
        status: "success",
        ...(historyEntry && {
          historyId: historyEntry.id,
          timestamp: historyEntry.timestamp,
        }),
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      }
    } catch (error) {
      console.error("❌ Error in sequentialthinking:", error)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                status: "failed",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      }
    }
  },
}

/**
 * Legacy addReasoningStep tool for backward compatibility
 */
export const addReasoningStepTool = {
  description:
    "Add a step to the reasoning process. (Legacy - use sequentialthinking instead)",
  parameters: z.object({
    title: z.string().describe("The title of the reasoning step"),
    content: z
      .string()
      .describe(
        "The content of the reasoning step. WRITE OUT ALL OF YOUR WORK. Where relevant, prove things mathematically."
      ),
    nextStep: z
      .enum(["continue", "finalAnswer"])
      .describe(
        "Whether to continue with another step or provide the final answer"
      )
      .default("continue"),
  }),
  execute: async (
    params: ReasoningStepParams
  ): Promise<SequentialThinkingResult> => {
    try {
      console.log(
        "🧠 addReasoningStep (legacy) called with:",
        JSON.stringify(params, null, 2)
      )

      // Validate required parameters
      if (!params.title || !params.content) {
        console.error("❌ Missing required parameters:", {
          title: params.title,
          content: params.content,
        })
        throw new Error(
          "Missing required parameters: title and content are required"
        )
      }

      // Convert legacy format to new format
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                title: params.title,
                content: params.content,
                nextStep: params.nextStep || "continue",
                status: "success",
                legacy: true,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      console.error("❌ Error in addReasoningStep:", error)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                status: "failed",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      }
    }
  },
}

/**
 * Validate thought data according to official MCP standards
 */
function validateThoughtData(input: SequentialThinkingParams): ThoughtData {
  if (!input.thought || typeof input.thought !== "string") {
    throw new Error("Invalid thought: must be a string")
  }
  if (!input.thoughtNumber || typeof input.thoughtNumber !== "number") {
    throw new Error("Invalid thoughtNumber: must be a number")
  }
  if (!input.totalThoughts || typeof input.totalThoughts !== "number") {
    throw new Error("Invalid totalThoughts: must be a number")
  }
  if (typeof input.nextThoughtNeeded !== "boolean") {
    throw new Error("Invalid nextThoughtNeeded: must be a boolean")
  }

  return {
    thought: input.thought,
    thoughtNumber: input.thoughtNumber,
    totalThoughts: input.totalThoughts,
    nextThoughtNeeded: input.nextThoughtNeeded,
    isRevision: input.isRevision,
    revisesThought: input.revisesThought,
    branchFromThought: input.branchFromThought,
    branchId: input.branchId,
    needsMoreThoughts: input.needsMoreThoughts,
  }
}
