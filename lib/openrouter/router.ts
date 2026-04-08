/**
 * OpenRouter Provider Routing Configuration
 *
 * Provides intelligent routing features for OpenRouter:
 * - Load balancing across multiple models
 * - Fallback models on errors
 * - Smart routing based on task type
 * - Cost optimization routing
 */

export interface RoutingStrategy {
  type: "balanced" | "speed" | "quality" | "cost"
  fallbackModels?: string[]
  maxRetries?: number
  timeout?: number
}

export interface RouterConfig {
  primaryModel: string
  strategy: RoutingStrategy
  provider: "openrouter"
}

/**
 * OpenRouter Router Configuration
 *
 * Smart routing strategies for OpenRouter models
 */
export const OPENROUTER_ROUTER_CONFIG: Record<string, RouterConfig> = {
  // Speed-optimized routing for quick responses
  speed: {
    primaryModel: "openrouter:stepfun/step-3.5-flash:free",
    strategy: {
      type: "speed",
      fallbackModels: [
        "openrouter:google/gemma-4-31b-it:free",
        "openrouter:openrouter/free",
      ],
      maxRetries: 2,
      timeout: 10000,
    },
    provider: "openrouter",
  },

  // Quality-optimized routing for complex tasks
  quality: {
    primaryModel: "openrouter:nvidia/nemotron-3-super-120b-a12b:free",
    strategy: {
      type: "quality",
      fallbackModels: [
        "openrouter:google/gemma-4-31b-it:free",
        "openrouter:z-ai/glm-4.5-air:free",
      ],
      maxRetries: 3,
      timeout: 30000,
    },
    provider: "openrouter",
  },

  // Cost-optimized routing (free models only)
  cost: {
    primaryModel: "openrouter:openrouter/free",
    strategy: {
      type: "cost",
      fallbackModels: [
        "openrouter:google/gemma-4-31b-it:free",
        "openrouter:stepfun/step-3.5-flash:free",
      ],
      maxRetries: 1,
      timeout: 15000,
    },
    provider: "openrouter",
  },

  // Balanced routing (default)
  balanced: {
    primaryModel: "openrouter:google/gemma-4-31b-it:free",
    strategy: {
      type: "balanced",
      fallbackModels: [
        "openrouter:stepfun/step-3.5-flash:free",
        "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
        "openrouter:openrouter/free",
      ],
      maxRetries: 2,
      timeout: 20000,
    },
    provider: "openrouter",
  },
}

/**
 * Gets the best model for a given routing strategy
 *
 * @param strategy - Routing strategy type
 * @returns Router configuration
 */
export function getRouterConfig(
  strategy: RoutingStrategy["type"] = "balanced"
): RouterConfig {
  return OPENROUTER_ROUTER_CONFIG[strategy] || OPENROUTER_ROUTER_CONFIG.balanced
}

/**
 * Gets a fallback model list for the given strategy
 *
 * @param strategy - Routing strategy type
 * @returns Array of fallback model IDs
 */
export function getFallbackModels(
  strategy: RoutingStrategy["type"] = "balanced"
): string[] {
  const config = getRouterConfig(strategy)
  return config.strategy.fallbackModels || [config.primaryModel]
}

/**
 * OpenRouter Provider Features
 *
 * Additional features enabled for OpenRouter provider
 */
export const OPENROUTER_FEATURES = {
  // Enable automatic fallback on errors
  autoFallback: true,

  // Enable load balancing across multiple models
  loadBalancing: true,

  // Enable cost tracking and optimization
  costOptimization: true,

  // Enable health checks for models
  healthChecks: true,

  // Enable smart routing based on prompt analysis
  smartRouting: true,
}

/**
 * Task-based routing recommendations
 *
 * Recommends the best model/routing strategy for different task types
 */
export const TASK_ROUTING: Record<string, RoutingStrategy["type"]> = {
  coding: "quality",
  chat: "speed",
  reasoning: "quality",
  creative: "quality",
  translation: "balanced",
  summarization: "speed",
  analysis: "quality",
  qa: "balanced",
  default: "balanced",
}
