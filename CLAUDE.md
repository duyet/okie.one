# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Okie** is an open-source AI chat interface forked from [Zola](https://github.com/ibelick/zola). It provides a unified interface for multiple AI providers (OpenAI, Claude, Gemini, Mistral, Ollama) with BYOK (Bring Your Own Key) support and self-hosting capabilities.

## Development Commands

```bash
# Development
pnpm dev             # Start dev server with Turbopack on http://localhost:3000
pnpm build           # Production build
pnpm start           # Start production server
pnpm lint            # Biome linting (138 warnings to fix)
pnpm type-check      # TypeScript validation (strict mode enabled)
pnpm test            # Run Vitest tests with coverage (current: 13.79%)
pnpm test:e2e        # Run Playwright E2E tests
pnpm fmt             # Format code with Biome
pnpm check           # Run Biome check with fixes

# Docker - Full Stack
docker-compose -f docker-compose.ollama.yml up  # Full stack with Ollama + models
docker build -t okie .                          # Build Docker image

# Analysis & Debugging  
ANALYZE=true pnpm build                         # Bundle analyzer with size breakdown
```

## Tech Stack

- **Next.js 15** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** components
- **Supabase** (PostgreSQL + Auth + Storage)
- **Vercel AI SDK** for multi-provider AI integration
- **Zustand** + **React Query** for state management

## Architecture Overview

### Core Pattern: Provider-based State Management
The app uses nested React Context providers for global state:

```typescript
// app/layout.tsx - Provider nesting
<TanstackQueryProvider>
  <UserProvider>
    <ModelProvider>
      <ChatsProvider>
        <ChatSessionProvider>
          <UserPreferencesProvider>
            {children}
```

### Directory Structure (Key Areas)

```
app/
├── api/                    # API routes
│   ├── chat/route.ts      # Main streaming chat endpoint
│   ├── models/route.ts    # Model discovery (Ollama + static)
│   ├── user-keys/         # BYOK encrypted key management
│   └── user-preferences/  # Settings persistence
├── components/            # App-specific components
│   ├── chat/             # Chat interface (streaming, files, tools)
│   └── layout/           # Navigation, sidebar, settings
└── c/[chatId]/           # Individual chat pages

lib/
├── models/               # AI model definitions by provider
├── chat-store/          # Chat state (messages, persistence)
├── user-store/          # User auth and profile state
├── supabase/           # Database client setup
├── openproviders/      # AI provider configurations
└── config.ts           # App constants (limits, defaults)

components/
├── ui/                  # shadcn/ui base components
├── prompt-kit/         # AI-specific UI components
└── icons/              # Provider brand icons
```

### State Management Patterns

1. **Server State**: React Query for API caching
2. **Global Client State**: Zustand stores in provider pattern
3. **Chat State**: Real-time via Supabase subscriptions
4. **Form State**: React Hook Form for complex forms

### AI Provider Integration

Models are defined in `lib/models/data/[provider].ts` with this structure:
```typescript
{
  id: "gpt-4.1-nano",
  name: "GPT-4.1 Nano", 
  provider: "OpenAI",
  providerId: "openai",
  modelFamily: "GPT-4",
  contextWindow: 128000,
  vision: true,
  tools: true,
  reasoning: false,      // Think mode capability
  webSearch: false,      // Web search capability
  openSource: false,
  apiSdk: (apiKey) => openproviders("gpt-4.1-nano", undefined, apiKey)
}
```

**Key Patterns**:
- **Static Models**: Defined in `lib/models/data/` by provider
- **Dynamic Discovery**: Ollama models auto-detected via `/api/models`
- **BYOK Security**: User API keys encrypted (AES-256-GCM) in `user_keys` table
- **Provider Mapping**: `lib/openproviders/provider-map.ts` handles SDK routing
- **Model Capabilities**: Flags for vision, tools, reasoning, webSearch determine UI features

## Database Schema (Key Tables)

- **users**: Auth, profiles, preferences
- **projects**: Hierarchical chat organization  
- **chats**: Conversation threads
- **messages**: AI SDK compatible format with streaming
- **user_keys**: Encrypted BYOK API keys per provider
- **chat_attachments**: File uploads

**Relationship**: Users → Projects → Chats → Messages

## Key Configuration

### Environment Variables
```bash
# App Configuration (for multi-domain deployments)
NEXT_PUBLIC_APP_NAME=Okie
NEXT_PUBLIC_VERCEL_URL=okie.one

# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=

# AI Providers (optional, BYOK preferred)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Security
CSRF_SECRET=
ENCRYPTION_KEY=

# Local AI
OLLAMA_BASE_URL=http://localhost:11434
```

### Important Config Files
- `lib/config.ts`: Rate limits, model defaults, system prompts (NON_AUTH_DAILY_MESSAGE_LIMIT: 5, AUTH_DAILY_MESSAGE_LIMIT: 1000)
- `middleware.ts`: CSRF protection, CSP headers
- `next.config.ts`: Bundle analyzer, image optimization
- `lib/models/types.ts`: ModelConfig interface definitions
- `lib/openproviders/provider-map.ts`: AI SDK provider routing

## Recent Features

### Think Mode (AI Reasoning)
**Think mode** enables AI models with reasoning capabilities to show their thinking process before providing final answers.

**Components**:
- `app/components/chat-input/button-think.tsx` - Think toggle button
- `app/components/chat/reasoning.tsx` - Reasoning display component  
- `components/ui/response-stream.tsx` - Streaming text renderer

**Implementation**:
- Button only appears for models with `reasoning: true` capability
- Auto-disables when switching to non-reasoning models
- State managed via `enableThink` in chat core hooks
- API endpoint passes `enableThink` parameter to AI SDK

**Adding reasoning support to a model**:
```typescript
// In lib/models/data/[provider].ts
{
  id: "claude-3.5-sonnet",
  reasoning: true,  // Enable think mode
  // ... other model config
}
```

### Sequential Thinking MCP (Advanced Reasoning)
**Sequential Thinking MCP** provides advanced reasoning capabilities for models that don't have native reasoning support, enabling step-by-step analysis through the MCP (Model Context Protocol) framework.

**Key Features**:
- **Universal Reasoning**: Enables reasoning mode for non-reasoning models
- **Step-by-Step Analysis**: Breaks down complex problems into sequential steps
- **Collapsible Steps**: Interactive UI to expand/collapse reasoning process
- **Authentication Required**: Feature requires user authentication

**UI Behavior**:
- **Non-reasoning models**: Shows toggle button "Sequential Thinking MCP"
- **Reasoning models**: Shows dropdown with options:
  - "Disable Thinking" 
  - "Thinking (Native)" - Uses model's built-in reasoning
  - "Sequential Thinking MCP" - Uses MCP-based reasoning
- **Guest users**: Shows authentication popover when clicked

**Components**:
- `app/components/chat-input/button-think.tsx` - Think mode selector with MCP option
- `app/components/chat/reasoning-steps.tsx` - Sequential reasoning steps display
- `app/components/chat/use-chat-core.ts` - Thinking mode state management

**Implementation Details**:
- `ThinkingMode` type: `"none" | "regular" | "sequential"`
- State managed via `thinkingMode` in `useChatCore`
- API passes `thinkingMode` parameter to enable MCP processing
- Response includes structured reasoning steps for display

**Testing**:
- E2E tests in `tests/e2e/sequential-thinking-mcp.spec.ts`
- UI-focused tests in `tests/e2e/sequential-thinking-simple.spec.ts` 
- Math integration tests in `tests/e2e/sequential-thinking-math.spec.ts`
- Tests UI behavior, authentication bypass, and button functionality
- Full integration testing requires MCP server setup and AI provider API keys

**Test Environment Setup**:
For complete E2E testing of Sequential Reasoning responses:
1. **MCP Server**: Sequential Thinking MCP server must be running
2. **API Keys**: AI provider API keys configured in environment
3. **Database**: Clean test database with proper guest user support
4. **Development Mode**: Tests run in development/test environment to bypass authentication

### Enhanced Model Selector
The model selector now includes visual capability indicators and quick settings access.

**Capability Icons**:
- 🟢 **Vision**: Eye icon (green) - Image understanding
- 🔵 **Tools**: Wrench icon (blue) - Function calling
- 🟣 **Reasoning**: Brain icon (purple) - Think mode support
- 🟠 **Web Search**: Globe icon (orange) - Web search capability

**Features**:
- Colored background badges for quick capability identification
- Tooltips on hover for accessibility
- "Manage Models" quick link to Settings > Models
- Optimized with Map-based provider lookups (O(1) performance)
- Full ARIA support for screen readers

**Components**:
- `components/common/model-selector/base.tsx` - Main selector component
- Mobile drawer and desktop dropdown variants
- Memoized filtering for performance

## Common Development Patterns

### Adding New AI Provider
1. Install AI SDK package: `pnpm add @ai-sdk/provider`
2. Create model definitions in `lib/models/data/provider.ts` (follow ModelConfig interface)
3. Add SDK mapping to `lib/openproviders/provider-map.ts`
4. Add brand icon to `components/icons/provider.tsx`
5. Test BYOK integration via user settings
6. Update FREE_MODELS_IDS in `lib/config.ts` if providing free tier

### Component Patterns
- **Server Components**: Data fetching, static content
- **Client Components**: Interactive features (use "use client")
- **Compound Components**: Complex UI split into composable parts
- **Error Boundaries**: Graceful error handling

### State Updates
- **Optimistic Updates**: UI updates before API confirmation
- **Real-time Sync**: Supabase subscriptions for live data
- **Cache Invalidation**: React Query for server state freshness

## Security Features

- **Row Level Security (RLS)**: Database-level access control
- **CSRF Protection**: Token-based prevention
- **Content Security Policy**: XSS prevention headers  
- **API Key Encryption**: User BYOK keys encrypted at rest
- **Input Sanitization**: DOMPurify for user content

## Development Notes

- **TypeScript**: Strict mode enabled throughout
- **Bundle Size**: Use dynamic imports for heavy components
- **Performance**: React Query caching, React.memo for expensive renders
- **Testing**: Jest + React Testing Library for components
- **Accessibility**: ARIA labels, keyboard navigation support

## Deployment

**Vercel** (recommended): Git-based with automatic deployments
**Docker**: Multi-stage builds with health checks
**Self-hosted**: Requires Node.js 18+, PostgreSQL, Redis (optional)

## Development Workflow

### Testing Changes
- **Local Testing**: Use `pnpm dev` with hot reload
- **Type Safety**: Run `pnpm type-check` before commits
- **Code Quality**: Run `pnpm lint` to catch issues
- **Bundle Analysis**: Use `ANALYZE=true pnpm build` for size optimization

### Working with AI Models
- **Testing Models**: Use MODEL_DEFAULT in `lib/config.ts` for default selection
- **Local AI**: Ollama auto-enables in development, disabled in production
- **BYOK Testing**: Test user key encryption/decryption flow
- **Rate Limits**: Respect daily limits defined in config (5 for non-auth, 1000 for auth)

## Troubleshooting

- **Build failures**: Run `pnpm type-check` and `pnpm lint`
- **Supabase issues**: Verify RLS policies and environment variables
- **AI provider errors**: Check API key validity and rate limits
- **Performance**: Use `ANALYZE=true pnpm build` for bundle analysis
- **Ollama not detected**: Ensure service running on OLLAMA_BASE_URL (default: localhost:11434)
- **Guest user persistence**: Enable anonymous authentication in Supabase Dashboard
- **Anonymous user caching**: Pages use `export const dynamic = "force-dynamic"` to prevent caching

## Testing & Code Quality

### Current Status
- **Test Coverage**: 13.79% (target: >70%)
- **Lint Warnings**: 138 total
  - 106 `noExplicitAny` - TypeScript any types to fix
  - 10 `useSemanticElements` - Accessibility improvements needed
  - 9 `noNonNullAssertion` - Non-null assertions to refactor
  - Others: array index keys, image optimization, etc.

### Testing Stack
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Coverage**: Vitest with v8 coverage reporter

### Key Test Files
- `tests/components/` - Component tests
- `tests/unit/` - Unit tests for utilities
- `tests/api/` - API route tests
- `tests/integration/` - Integration tests
- `tests/e2e/` - End-to-end tests

### Code Quality Tools
- **Linting**: Biome (replaces ESLint + Prettier)
- **Type Checking**: TypeScript strict mode
- **Formatting**: Biome formatter

```

Do not use any type