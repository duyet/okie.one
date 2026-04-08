#!/bin/bash
# Setup Vercel Environment Variables for Okie
# Usage: ./scripts/setup-vercel-env.sh

set -e

PROJECT_SCOPE="duyet-team"

echo "🔧 Setting up Vercel environment variables..."
echo ""

# Admin emails for analytics dashboard access
echo "📧 Setting ADMIN_EMAILS..."
echo "lvduit08@gmail.com,duyet.cs@gmail.com" | vercel env add ADMIN_EMAILS production --scope $PROJECT_SCOPE

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "To verify, run:"
echo "  vercel env ls --scope $PROJECT_SCOPE"
echo ""
echo "⚠️  Don't forget to set these Supabase variables if not already set:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE"
echo ""
echo "Example:"
echo '  vercel env add NEXT_PUBLIC_SUPABASE_URL production --scope $PROJECT_SCOPE'
