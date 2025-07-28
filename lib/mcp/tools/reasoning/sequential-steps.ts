/**
 * Sequential Steps Utilities
 */

import type { ReasoningStep } from "./types"

/**
 * Process and validate reasoning steps
 */
export function processReasoningSteps(steps: ReasoningStep[]): ReasoningStep[] {
  return steps.filter((step) => step.title && step.content)
}

/**
 * Check if reasoning steps are complete
 */
export function areStepsComplete(steps: ReasoningStep[]): boolean {
  return steps.length > 0 && steps[steps.length - 1]?.nextStep === "finalAnswer"
}

/**
 * Get step count for display
 */
export function getStepCount(steps: ReasoningStep[]): number {
  return steps.length
}
