"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useSettingsStore } from "@/lib/settings-store/store"
import { OpenAICompatibleProvider } from "@/lib/settings-store/types"
import { Plus, Trash } from "@phosphor-icons/react"
import { useState } from "react"

export function ProviderSettingsSection() {
  const {
    providers,
    customProviders,
    updateProvider,
    addCustomProvider,
    removeCustomProvider,
  } = useSettingsStore()
  const [newProvider, setNewProvider] = useState({
    name: "",
    baseUrl: "",
    apiKey: "",
  })

  const handleAddCustomProvider = () => {
    if (!newProvider.name || !newProvider.baseUrl) return

    const provider: OpenAICompatibleProvider = {
      id: `custom-${Date.now()}`,
      name: newProvider.name,
      baseUrl: newProvider.baseUrl,
      apiKey: newProvider.apiKey,
      enabled: true,
      type: "openai-compatible",
    }

    addCustomProvider(provider)
    setNewProvider({ name: "", baseUrl: "", apiKey: "" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="mb-2 text-lg font-medium">Model Providers</h3>
        <p className="text-muted-foreground text-sm">
          Configure AI model providers and add custom OpenAI-compatible
          endpoints.
        </p>
      </div>

      {/* Built-in Providers */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Built-in Providers</h4>
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-1">
              <div className="font-medium">{provider.name}</div>
              <div className="text-muted-foreground text-sm">
                {provider.type === "ollama"
                  ? "Local AI models"
                  : `${provider.name} API`}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {provider.type === "ollama" && (
                <div className="space-y-2">
                  <Label htmlFor={`${provider.id}-url`} className="text-sm">
                    Base URL
                  </Label>
                  <Input
                    id={`${provider.id}-url`}
                    value={provider.baseUrl || ""}
                    onChange={(e) =>
                      updateProvider(provider.id, { baseUrl: e.target.value })
                    }
                    placeholder="http://localhost:11434"
                    className="w-48"
                  />
                </div>
              )}
              <div className="flex flex-col items-center space-y-1">
                <Switch
                  checked={provider.enabled}
                  onCheckedChange={(enabled) =>
                    updateProvider(provider.id, { enabled })
                  }
                />
                <span className="text-muted-foreground text-xs">
                  {provider.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Providers */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">
          Custom OpenAI-Compatible Providers
        </h4>

        {/* Add new provider form */}
        <div className="space-y-4 rounded-lg border p-4">
          <h5 className="font-medium">Add New Provider</h5>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Provider Name</Label>
              <Input
                id="provider-name"
                value={newProvider.name}
                onChange={(e) =>
                  setNewProvider({ ...newProvider, name: e.target.value })
                }
                placeholder="My Custom Provider"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-url">Base URL</Label>
              <Input
                id="provider-url"
                value={newProvider.baseUrl}
                onChange={(e) =>
                  setNewProvider({ ...newProvider, baseUrl: e.target.value })
                }
                placeholder="https://api.example.com/v1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-key">API Key (Optional)</Label>
            <Input
              id="provider-key"
              type="password"
              value={newProvider.apiKey}
              onChange={(e) =>
                setNewProvider({ ...newProvider, apiKey: e.target.value })
              }
              placeholder="sk-..."
            />
            <p className="text-muted-foreground text-xs">
              API key for authentication. Leave empty if not required.
            </p>
          </div>
          <Button
            onClick={handleAddCustomProvider}
            disabled={!newProvider.name || !newProvider.baseUrl}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 size-4" />
            Add Provider
          </Button>
        </div>

        {/* Existing custom providers */}
        {customProviders.length > 0 ? (
          <div className="space-y-2">
            {customProviders.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {provider.baseUrl}
                  </div>
                  {provider.apiKey && (
                    <div className="text-muted-foreground text-xs">
                      API Key: {provider.apiKey.substring(0, 8)}...
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col items-center space-y-1">
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(enabled) =>
                        updateProvider(provider.id, { enabled })
                      }
                    />
                    <span className="text-muted-foreground text-xs">
                      {provider.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomProvider(provider.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
            <Plus className="mx-auto mb-2 size-8 opacity-50" />
            <p className="text-sm">No custom providers configured yet.</p>
            <p className="text-xs">Add OpenAI-compatible endpoints above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
