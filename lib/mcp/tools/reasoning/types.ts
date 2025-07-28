/**
 * Reasoning Tools Types
 */

export interface ReasoningStep {
  title: string
  content: string
  nextStep?: "continue" | "finalAnswer"
}

export interface ReasoningStepsProps {
  steps: ReasoningStep[]
  isStreaming?: boolean
}
