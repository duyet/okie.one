#!/bin/bash
# Deploy Database Migration to Supabase
# Usage: SUPABASE_DATABASE_URL="postgresql://..." ./scripts/deploy-db-migration.sh

set -e

MIGRATION_FILE="supabase/migrations/20250408_000000_user_analytics.sql"

echo "🗄️  Deploying database migration to Supabase..."
echo ""

# Check if SUPABASE_DATABASE_URL is set
if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "❌ Error: SUPABASE_DATABASE_URL environment variable not set"
  echo ""
  echo "Please set it and run again:"
  echo '  export SUPABASE_DATABASE_URL="postgresql://user:password@host:port/dbname"'
  echo "  ./scripts/deploy-db-migration.sh"
  echo ""
  echo "Or copy-paste the migration file manually to Supabase Dashboard:"
  echo "  1. Go to https://supabase.com/dashboard"
  echo "  2. Select your project"
  echo "  3. SQL Editor > New Query"
  echo "  4. Copy contents of: $MIGRATION_FILE"
  echo "  5. Run the query"
  exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Deploy using psql or Supabase CLI
if command -v supabase &> /dev/null; then
  echo "🚀 Using Supabase CLI..."
  supabase db push --db-url "$SUPABASE_DATABASE_URL"
elif command -v psql &> /dev/null; then
  echo "🚀 Using psql..."
  psql "$SUPABASE_DATABASE_URL" -f "$MIGRATION_FILE"
else
  echo "⚠️  Neither Supabase CLI nor psql found"
  echo ""
  echo "Please deploy manually via Supabase Dashboard:"
  echo "  1. Go to https://supabase.com/dashboard"
  echo "  2. Select your project"
  echo "  3. SQL Editor > New Query"
  echo "  4. Copy contents of: $MIGRATION_FILE"
  echo "  5. Run the query"
  exit 1
fi

echo ""
echo "✅ Migration deployed successfully!"
echo ""
echo "To verify, run in Supabase SQL Editor:"
echo "  SELECT * FROM user_events LIMIT 1;"
echo "  SELECT * FROM daily_active_users LIMIT 1;"
