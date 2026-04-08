#!/bin/bash
# Sync Environment Variables from Local File to Vercel
# Usage: ./scripts/sync-env-to-vercel.sh [env-file]
#
# Reads environment variables from a local file and sets them on Vercel
# Default env file: .env.production

set -e

PROJECT_SCOPE="duyet-team"
ENV_FILE="${1:-.env.production}"

echo "🔄 Syncing environment variables to Vercel..."
echo "📄 Source file: $ENV_FILE"
echo ""

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: Environment file not found: $ENV_FILE"
  echo ""
  echo "Create it with your variables:"
  echo "  cat > $ENV_FILE << EOF"
  echo "  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx..."
  echo "  SUPABASE_SERVICE_ROLE=eyJxxx..."
  echo "  ADMIN_EMAILS=admin@example.com"
  echo "  EOF"
  exit 1
fi

# Read and set each variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue

  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)

  # Remove quotes if present
  value="${value%\"}"
  value="${value#\"}"

  echo "📝 Setting $key..."

  # Pipe value to vercel env add
  echo "$value" | vercel env add "$key" production --scope $PROJECT_SCOPE 2>/dev/null && echo "  ✅ Set" || echo "  ⚠️  Failed (may already be set)"

done < "$ENV_FILE"

echo ""
echo "✅ Environment variables synced!"
echo ""
echo "To verify, run:"
echo "  vercel env ls --scope $PROJECT_SCOPE"
echo ""
echo "⚠️  Note: Changes require a redeployment to take effect:"
echo "  vercel redeploy --scope $PROJECT_SCOPE"
