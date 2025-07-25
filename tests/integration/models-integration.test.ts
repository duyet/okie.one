import { describe, expect, it } from "vitest"

describe("Models Integration", () => {
  it("should load OpenAI models", async () => {
    const { openaiModels } = await import("@/lib/models/data/openai")

    expect(openaiModels).toBeInstanceOf(Array)
    expect(openaiModels.length).toBeGreaterThan(0)

    const gptModel = openaiModels.find((m) => m.id.includes("gpt"))
    expect(gptModel).toBeDefined()
    expect(gptModel?.provider).toBe("OpenAI")
    expect(gptModel?.providerId).toBe("openai")
  })

  it("should load Claude models", async () => {
    const { claudeModels } = await import("@/lib/models/data/claude")

    expect(claudeModels).toBeInstanceOf(Array)
    expect(claudeModels.length).toBeGreaterThan(0)

    const claudeModel = claudeModels.find((m) => m.id.includes("claude"))
    expect(claudeModel).toBeDefined()
    expect(claudeModel?.provider).toBe("Anthropic")
    expect(claudeModel?.providerId).toBe("anthropic")
  })

  it("should load Gemini models", async () => {
    const { geminiModels } = await import("@/lib/models/data/gemini")

    expect(geminiModels).toBeInstanceOf(Array)
    expect(geminiModels.length).toBeGreaterThan(0)

    const geminiModel = geminiModels.find((m) => m.id.includes("gemini"))
    expect(geminiModel).toBeDefined()
    expect(geminiModel?.provider).toBe("Google")
    expect(geminiModel?.providerId).toBe("google")
  })

  it("should validate all models have required properties", async () => {
    const modules = [
      "@/lib/models/data/openai",
      "@/lib/models/data/claude",
      "@/lib/models/data/gemini",
      "@/lib/models/data/mistral",
    ]

    for (const modulePath of modules) {
      const module = await import(modulePath)
      const models = Object.values(module).find((val) =>
        Array.isArray(val)
      ) as unknown[]

      if (models && models.length > 0) {
        models.forEach((model: unknown) => {
          expect(model).toHaveProperty("id")
          expect(model).toHaveProperty("name")
          expect(model).toHaveProperty("provider")
          expect(model).toHaveProperty("providerId")
          expect(
            typeof (model as { contextWindow: number }).contextWindow
          ).toBe("number")
          expect(
            (model as { contextWindow: number }).contextWindow
          ).toBeGreaterThan(0)
        })
      }
    }
  })
})
