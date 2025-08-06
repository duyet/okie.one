import { generateText } from "ai"

import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { validateModelSupportsFiles } from "@/lib/file-handling"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import type { ProviderWithoutOllama } from "@/lib/user-keys"

import { createErrorResponse } from "../../chat/utils"

export const maxDuration = 30

type AnalyzeRequest = {
  fileUrl: string
  fileName: string
  fileType: string | null
  userId: string
  model?: string
  isAuthenticated: boolean
}

const ANALYSIS_PROMPT = `You are an AI assistant specialized in analyzing files and documents. 
Analyze the provided file and generate:
1. A comprehensive summary (2-3 paragraphs)
2. Key points or insights (3-5 bullet points)
3. The primary language or format
4. Main topics or themes
5. An assessment of complexity (simple, moderate, or complex)

Format your response as JSON with the following structure:
{
  "summary": "string",
  "keyPoints": ["string", "string", ...],
  "fileType": "string",
  "language": "string (optional)",
  "topics": ["string", "string", ...],
  "complexity": "simple" | "moderate" | "complex"
}`

export async function POST(req: Request) {
  try {
    const {
      fileUrl,
      fileName,
      fileType,
      userId,
      model = "gpt-4-turbo",
      isAuthenticated,
    } = (await req.json()) as AnalyzeRequest

    if (!fileUrl || !fileName || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required information" }),
        { status: 400 }
      )
    }

    // Validate model supports files
    if (!validateModelSupportsFiles(model)) {
      return new Response(
        JSON.stringify({
          error:
            "Selected model does not support file analysis. Please use a vision-enabled model.",
        }),
        { status: 400 }
      )
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    let apiKey: string | undefined
    if (isAuthenticated && userId) {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
      const provider = getProviderForModel(model)
      apiKey =
        (await getEffectiveApiKey(userId, provider as ProviderWithoutOllama)) ||
        undefined
    }

    // Generate analysis using AI
    const result = await generateText({
      model: modelConfig.apiSdk(apiKey),
      system: SYSTEM_PROMPT_DEFAULT,
      prompt: ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",

          content: [
            {
              type: "text",
              text: `Please analyze this file: ${fileName}`,
            },
            {
              type: "image",
              image: fileUrl,
            },
          ],
        },
      ],
    })

    // Parse the AI response
    try {
      const analysis = JSON.parse(result.text)

      // Validate the response structure
      if (!analysis.summary || !Array.isArray(analysis.keyPoints)) {
        throw new Error("Invalid analysis format")
      }

      return new Response(JSON.stringify(analysis), {
        headers: { "Content-Type": "application/json" },
      })
    } catch (parseError) {
      console.error("Failed to parse AI analysis:", parseError)

      // Fallback response if parsing fails
      return new Response(
        JSON.stringify({
          summary: `${result.text.slice(0, 500)}...`,
          keyPoints: ["Analysis completed but formatting error occurred"],
          fileType: fileType || "Unknown",
          topics: [],
          complexity: "moderate",
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }
  } catch (err: unknown) {
    console.error("Error in /api/files/analyze:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
