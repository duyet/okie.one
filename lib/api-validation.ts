import { z } from "zod"

/**
 * Chat Request Schema with comprehensive validation
 * Provides security through strict input validation and type safety
 *
 * Note: Uses .passthrough() to allow additional fields from AI SDK types
 * that we don't explicitly validate, maintaining flexibility while ensuring core security
 */
export const ChatRequestSchema = z
  .object({
    messages: z.array(z.any()).min(1).max(100),
    chatId: z.string().uuid(),
    userId: z.string().uuid(),
    model: z.string().max(100),
    isAuthenticated: z.boolean(),
    systemPrompt: z.string().max(10000).optional(),
    tools: z.array(z.any()).optional(),
    enableThink: z.boolean().optional(),
    thinkingMode: z.enum(["none", "regular", "sequential"]).optional(),
    // Legacy support - will be deprecated
    enableSearch: z.boolean().optional(),
    message_group_id: z.string().optional(),
  })
  .passthrough()

export type ChatRequest = z.infer<typeof ChatRequestSchema>
