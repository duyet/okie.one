# GitHub Actions Setup for E2E Tests

This document explains how to set up GitHub Actions environment variables and secrets to enable e2e tests in CI.

## Overview

The e2e tests require certain environment variables to function properly. The GitHub Actions workflow is designed to work with minimal configuration for guest user functionality, but additional secrets can be added for full functionality.

## Required Setup

### 1. Automatic Environment Variables

These are generated automatically by the GitHub Actions workflow:

- `ENCRYPTION_KEY`: Generated using `openssl rand -base64 32`
- `CSRF_SECRET`: Generated using `openssl rand -hex 32`

### 2. Repository Variables (Optional)

Set these in **Repository Settings → Secrets and variables → Actions → Variables**:

| Variable Name | Description | Default Value |
|---------------|-------------|---------------|
| `NEXT_PUBLIC_VERCEL_URL` | Your production domain | `localhost:3000` (for e2e), `okie.one` (for build) |

### 3. Repository Secrets (Optional)

Set these in **Repository Settings → Secrets and variables → Actions → Secrets**:

#### Supabase (Optional - app works without it for guest users)
| Secret Name | Description | Required |
|-------------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | No |
| `SUPABASE_SERVICE_ROLE` | Your Supabase service role key | No |

#### AI Provider API Keys (Optional - for testing actual AI responses)
| Secret Name | Description | Required |
|-------------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | No |
| `ANTHROPIC_API_KEY` | Anthropic/Claude API key | No |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key | No |
| `MISTRAL_API_KEY` | Mistral AI API key | No |
| `OPENROUTER_API_KEY` | OpenRouter API key | No |
| `XAI_API_KEY` | xAI/Grok API key | No |
| `PERPLEXITY_API_KEY` | Perplexity API key | No |

#### Additional Services (Optional)
| Secret Name | Description | Required |
|-------------|-------------|----------|
| `EXA_API_KEY` | Exa search API key | No |

## Minimal Setup for Guest User E2E Tests

The e2e tests will work with **zero additional configuration**. The guest user functionality is designed to work without:
- Supabase authentication
- AI provider API keys
- External services

The tests focus on:
- Guest user creation and persistence
- Chat interface functionality
- UI interactions
- Page navigation
- Local storage behavior

## Full Setup for Complete E2E Testing

To enable complete functionality including AI responses and user authentication:

1. **Set up Supabase** (if you want to test authenticated user flows):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE=your-service-role-key
   ```

2. **Add AI Provider Keys** (if you want to test actual AI responses):
   ```bash
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   # Add others as needed
   ```

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the name and value
5. Click **Add secret**

## Environment Variable Priority

The workflow uses the following priority for environment variables:

1. **Generated values** (ENCRYPTION_KEY, CSRF_SECRET)
2. **Repository secrets** (if set)
3. **Default/fallback values** (empty strings for optional vars)

## Testing the Setup

After setting up the secrets:

1. Push changes to trigger the GitHub Actions workflow
2. Check the **Actions** tab in your repository
3. Look for the "E2E Tests" job
4. Review the logs to ensure proper environment setup

## Troubleshooting

### E2E Tests Failing Due to Missing Environment

- **Symptom**: Tests fail with environment-related errors
- **Solution**: Check that `ENCRYPTION_KEY` and `CSRF_SECRET` are being generated properly in the workflow

### Build Failures

- **Symptom**: Build step fails during GitHub Actions
- **Solution**: Ensure the build environment variables are properly set in the workflow

### Guest User Tests Not Working

- **Symptom**: Guest user functionality doesn't work in e2e tests
- **Solution**: The app is designed to work without external dependencies. Check the test implementation and ensure localStorage is available.

## Security Notes

- Secrets are never exposed in logs or to external repositories
- The `ENCRYPTION_KEY` is generated fresh for each workflow run
- API keys are optional and the app gracefully degrades without them
- All secrets should be treated as sensitive information

## Local Development vs CI

| Environment | Encryption Key | CSRF Secret | AI Keys | Supabase |
|-------------|----------------|-------------|---------|----------|
| Local Dev | Manual setup | Manual setup | Optional | Optional |
| GitHub CI | Auto-generated | Auto-generated | From secrets | From secrets |

The CI environment is designed to be more isolated and secure than local development. 