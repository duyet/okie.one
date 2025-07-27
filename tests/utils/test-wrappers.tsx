import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

// Mock the UserPreferencesProvider for tests
const MockUserPreferencesProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const mockContext = {
    preferences: {
      layout: "sidebar" as const,
      theme: "light" as const,
      model: "gpt-4" as const,
    },
    updatePreferences: () => Promise.resolve(),
    isLoading: false,
  }

  return (
    <div data-testid="mock-user-preferences-provider">
      {React.cloneElement(React.Children.only(children as React.ReactElement), {
        ...mockContext,
      })}
    </div>
  )
}

// Create a wrapper that provides all necessary context
export function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MockUserPreferencesProvider>{children}</MockUserPreferencesProvider>
    </QueryClientProvider>
  )
}

// Higher-order component for wrapping components that need providers
export function withProviders<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <TestWrapper>
        <Component {...props} />
      </TestWrapper>
    )
  }
}
