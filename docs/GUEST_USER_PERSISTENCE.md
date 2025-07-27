# Guest User Persistence Guide

This guide explains how guest users can save their chats and messages to the database in Okie.

## Overview

Guest users in Okie can chat without creating an account. However, to save their conversations to the database, certain configurations are required.

## When Supabase Client is Not Available

The Supabase client will not be available in these scenarios:

1. **Missing Environment Variables**:
   ```bash
   # Required for client-side operations
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   
   # Also required for server-side operations
   SUPABASE_SERVICE_ROLE_KEY=  # or SUPABASE_SERVICE_ROLE
   ```

2. **Test Environments**: When running tests without Supabase configured
3. **Local Development**: When developing without a Supabase instance

When Supabase is not available, guest users can still use the chat interface, but their messages won't be persisted to the database.

## Enabling Guest User Persistence

There are two approaches to enable guest user persistence:

### Option 1: Enable Anonymous Authentication (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Providers
3. Enable "Anonymous Sign-Ins"
4. Guest users will automatically sign in anonymously and can save data

### Option 2: Apply Database Migration (Alternative)

If you cannot enable anonymous authentication, apply the provided migration:

```bash
# Run the migration
psql $DATABASE_URL < supabase/migrations/20240000000001_fix_guest_users_fk.sql
```

This migration:
- Makes foreign key constraints deferrable
- Creates a trigger to auto-create auth.users entries for anonymous users
- Updates RLS policies to allow anonymous users to save data

**Warning**: This approach creates auth.users entries without proper authentication. Use with caution and only in controlled environments.

## How It Works

1. **Guest User Initialization**:
   - When a user visits without signing in, they get a UUID as their guest ID
   - The system attempts to sign them in anonymously with Supabase
   - If successful, a user profile is created in the database

2. **Data Persistence**:
   - Once the guest user exists in the database, they can:
     - Create and save chats
     - Send and receive messages
     - Have their chat history persist across sessions

3. **Session Persistence**:
   - Guest user IDs are stored in localStorage
   - When returning, the same guest ID is used
   - Their previous chats are accessible

## Troubleshooting

### "Foreign key constraint" errors

If you see errors like:
```
insert or update on table "users" violates foreign key constraint "users_id_fkey"
```

This means:
1. Anonymous authentication is not enabled in Supabase, OR
2. The migration hasn't been applied

**Solution**: Enable anonymous auth or apply the migration.

### "Supabase not available" warnings

If you see:
```
WARNING: Supabase is not available in this deployment.
```

This means:
1. Environment variables are missing
2. Check your `.env.local` file has all required Supabase variables

### Guest users can chat but data isn't saved

This is expected behavior when:
1. Supabase is not configured
2. Anonymous auth is disabled and migration not applied

The application gracefully degrades to allow chatting without persistence.

## Security Considerations

1. **Anonymous Authentication**: 
   - Safer approach
   - Managed by Supabase
   - Proper session handling

2. **Migration Approach**:
   - Creates auth.users entries without authentication
   - Should only be used in controlled environments
   - Consider implementing cleanup for old anonymous users

## Best Practices

1. **Always prefer enabling anonymous authentication** over the migration approach
2. **Set up rate limiting** for anonymous users to prevent abuse
3. **Implement cleanup jobs** to remove old anonymous user data
4. **Monitor usage** to ensure anonymous users aren't consuming excessive resources