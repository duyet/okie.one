#!/bin/bash
# Complete Deployment Script for Okie
# Syncs environment variables and triggers redeployment

set -e

PROJECT_SCOPE="duyet-team"

echo "🚀 Okie Complete Deployment"
echo "============================"
echo ""

# Step 1: Sync environment variables from .env.production
echo "Step 1: Syncing environment variables..."
echo ""

if [ -f ".env.production" ]; then
  ./scripts/sync-env-to-vercel.sh .env.production
else
  echo "⚠️  .env.production not found"
  echo ""
  echo "Create it from the template:"
  echo "  cp .env.production.example .env.production"
  echo "  # Edit .env.production with your values"
  echo "  ./scripts/full-deploy.sh"
  echo ""
  read -p "Continue with existing Vercel environment variables? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 2: Trigger redeployment
echo ""
echo "Step 2: Triggering production redeployment..."
echo ""

# Get current production deployment URL
DEPLOY_URL=$(vercel ls --scope $PROJECT_SCOPE 2>/dev/null | grep "okie.one" | head -1 | awk '{print $2}')

if [ -n "$DEPLOY_URL" ]; then
  echo "🔄 Redeploying: $DEPLOY_URL"
  vercel redeploy "$DEPLOY_URL" --scope $PROJECT_SCOPE
else
  echo "🆕 Deploying to production..."
  vercel --prod --scope $PROJECT_SCOPE
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Deploy database migration: ./scripts/deploy-db-migration.sh"
echo "  2. Visit production: https://okie.one"
echo "  3. Test analytics: https://okie.one/admin/analytics (requires admin login)"
echo ""
echo "🔧 Useful commands:"
echo "  vercel env ls --scope $PROJECT_SCOPE    # List all env vars"
echo "  vercel logs --scope $PROJECT_SCOPE       # View deployment logs"
