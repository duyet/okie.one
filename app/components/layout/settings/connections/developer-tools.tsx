"use client"

import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

type DeveloperTool = {
  id: string
  name: string
  icon: string
  description: string
  envKeys: string[]
  connected: boolean
  maskedKey: string | null
  sampleEnv: string
}

type DeveloperToolsResponse = {
  tools: DeveloperTool[]
}

export function DeveloperTools() {
  const { data, isLoading } = useQuery<DeveloperToolsResponse>({
    queryKey: ["developer-tools"],
    queryFn: async () => {
      const res = await fetch("/api/developer-tools")
      if (!res.ok) throw new Error("Failed to fetch tools")
      return res.json()
    },
  })

  const tools = data?.tools ?? []

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        status: "success",
      })
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      toast({
        title: "Failed to copy to clipboard",
        status: "error",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="text-muted-foreground">Loading connections...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h3 className="mb-2 font-medium text-lg">Developer Tool connections</h3>
        <p className="text-muted-foreground text-sm">
          Add API keys in .env.local to enable tools like Exa and GitHub. These
          keys follow specific formats and are only used in development mode.
        </p>
      </div>

      {/* Tools List */}
      <div className="space-y-6">
        {tools.map((tool) => (
          <div key={tool.id} className="rounded-lg border border-border p-3">
            <div className="space-y-4">
              {/* Tool Header */}
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-medium">{tool.name}</h4>
                    {tool.connected ? (
                      <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground text-xs">
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive text-xs">
                        Not connected
                      </span>
                    )}
                  </div>

                  <p className="mb-3 text-muted-foreground text-sm">
                    {tool.description}
                  </p>

                  {/* Connected State - Show Masked Key */}
                  {tool.connected && tool.maskedKey && (
                    <div className="flex flex-col gap-2">
                      <div className="text-muted-foreground text-sm">
                        Key detected:
                      </div>
                      <div className="mb-3 rounded bg-secondary px-3 py-2 font-mono text-muted-foreground text-xs">
                        {tool.maskedKey}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Keys Section - Always Show */}
              <div className="space-y-2">
                <p className="font-medium text-sm">Required keys:</p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-md border bg-muted p-3 font-mono text-foreground text-xs">
                    {tool.sampleEnv}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 h-6 px-2 text-xs"
                    onClick={() => copyToClipboard(tool.sampleEnv)}
                  >
                    Copy to clipboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
