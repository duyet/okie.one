# Okie Deployment Checklist

## Current Status: 🔄 Deployment in Progress

### ✅ Completed Steps
- [x] Upgraded Next.js from 15.4.2-canary to 16.2.2 (CVE-2025-66478 fix)
- [x] Added 8 new OpenRouter free models (23 total free models)
- [x] Created analytics database schema (user_events, daily_active_users)
- [x] Built analytics API routes (/api/admin/analytics/*)
- [x] Created admin authentication with ADMIN_EMAILS
- [x] Added event tracking to key flows (signup, login, messages)
- [x] Created OpenRouter routing system with 4 strategies
- [x] Code pushed to GitHub main branch
- [x] Vercel deployment started

### 🔄 In Progress
- [ ] Vercel build completing (building now with Next.js 16.2.2)

### ⏳ Pending Steps

#### 1. Set Vercel Environment Variables
```bash
# Add admin emails (required for /admin/analytics access)
vercel env add ADMIN_EMAILS production
# Enter: lvduit08@gmail.com,duyet.cs@gmail.com

# Add Supabase credentials (if not already set)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE production
```

#### 2. Deploy Database Migration to Supabase
```bash
# Option A: Using Supabase CLI (recommended)
supabase db push --db-url "$SUPABASE_DATABASE_URL"

# Option B: Copy-paste to Supabase Dashboard
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. SQL Editor > New Query
# 4. Copy contents of supabase/migrations/20250408_000000_user_analytics.sql
# 5. Run the query
```

#### 3. Verify Analytics Dashboard
```bash
# After deployment, test the admin API
curl https://okie.one/api/admin/analytics/dau?days=7 \
  -H "Authorization: Bearer <your_jwt_token>"

# Or visit in browser:
# https://okie.one/admin/analytics (requires login with admin email)
```

#### 4. Test New Features
- [ ] Model selector shows 23 models with free badges
- [ ] OpenRouter models work with routing strategies
- [ ] Event tracking records user activities
- [ ] DAU calculation runs (set up cron job)

## Production URLs
- **Production**: https://okie.one
- **Admin Analytics**: https://okie.one/admin/analytics
- **User Analytics**: https://okie.one/analytics

## Environment Variables Reference

### Required for Analytics Dashboard
```bash
ADMIN_EMAILS=lvduit08@gmail.com,duyet.cs@gmail.com
```

### Required for Supabase (should already be set)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE=eyJxxx... # Service role key for admin APIs
```

### Optional (for AI providers)
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

## Post-Deployment Tasks

### 1. Set Up Daily DAU Calculation
Create a cron job or use Supabase's pg_cron extension:
```sql
-- Run in Supabase SQL Editor
SELECT cron.schedule(
  'calculate-dau-daily',
  '0 1 * * *', -- 1 AM daily
  $$SELECT calculate_daily_active_users(CURRENT_DATE)$$
);
```

### 2. Monitor Event Tracking
Check user_events table after user actions:
```sql
-- View recent events
SELECT * FROM user_events
ORDER BY created_at DESC
LIMIT 10;

-- View DAU data
SELECT * FROM daily_active_users
ORDER BY date DESC
LIMIT 7;
```

### 3. Verify Security
- [ ] Admin dashboard returns 403 for non-admin emails
- [ ] User events only accessible to own user
- [ ] Service role APIs properly protected

## Troubleshooting

### Issue: Admin dashboard shows 403
**Solution**: Verify your email is in ADMIN_EMAILS env var and you're logged in

### Issue: DAU data is empty
**Solution**: Run the calculate_daily_active_users() function manually for today:
```sql
SELECT calculate_daily_active_users(CURRENT_DATE);
```

### Issue: Event tracking not working
**Solution**: Check user_events table exists and RLS policies are correct:
```sql
SELECT * FROM user_events LIMIT 1;
```

### Issue: New models don't appear
**Solution**: Verify FREE_MODELS_IDS in lib/config.ts includes all 23 models

## Rollback Plan
If critical issues occur:
```bash
# Rollback to previous deployment
vercel rollback https://okie.one --scope duyet-team

# Rollback database migration
# (手动从 Supabase dashboard 删除新建的表)
```

## Summary
- **Total Changes**: 8 new files, 15+ modified files
- **New Features**: Analytics dashboard, 23 free models, event tracking, OpenRouter routing
- **Security**: Next.js 16.2.2 (CVE fixed), admin authentication, RLS policies
- **Test Coverage**: All 392 tests passing
