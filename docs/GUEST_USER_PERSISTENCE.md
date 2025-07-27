# Guest User Persistence Guide

This guide explains how guest users can save their chats and messages to the database in Okie.

## Overview

Guest users in Okie can chat without creating an account using Supabase's anonymous authentication feature. This allows them to save their conversations persistently.

## Prerequisites

### Environment Variables

The following environment variables must be configured:

```bash
# Required for client-side operations
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Also required for server-side operations
SUPABASE_SERVICE_ROLE_KEY=  # or SUPABASE_SERVICE_ROLE
```

Without these variables, guest users can still use the chat interface, but their messages won't be persisted to the database.

## Enabling Guest User Persistence

### Enable Anonymous Authentication in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Enable **"Anonymous Sign-Ins"**
4. Save the configuration

Once enabled, guest users will automatically:
- Sign in anonymously when they visit the site
- Have their chats and messages saved to the database
- Maintain their session across page reloads

### Important: Dynamic Rendering with Next.js

Okie uses Next.js dynamic rendering to prevent caching issues with anonymous users. The pages are configured with:

```typescript
export const dynamic = "force-dynamic"
```

This ensures that each anonymous user gets their own unique session and prevents metadata from being cached across different users.

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

This means anonymous authentication is not enabled in Supabase.

**Solution**: Follow the steps above to enable anonymous authentication in your Supabase Dashboard.

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
2. Anonymous authentication is disabled

The application gracefully degrades to allow chatting without persistence.

## Converting Anonymous Users to Permanent Users

You can convert anonymous users to permanent users by linking an identity:

### Link an OAuth Identity

```typescript
// Link a Google account to the anonymous user
const { data, error } = await supabase.auth.linkIdentity({ provider: 'google' })
```

### Link to an Existing Account

For linking to an existing email/password account, you'll need to:
1. Sign in with the existing account
2. Manually migrate data from the anonymous user
3. Implement your conflict resolution strategy

## Security Considerations

- **Anonymous Authentication** is managed securely by Supabase
- Each anonymous user gets a unique UUID
- Sessions are properly handled with JWT tokens
- Rate limiting should be implemented for anonymous users

## Best Practices

1. **Enable anonymous authentication** in Supabase Dashboard
2. **Set up rate limiting** for anonymous users to prevent abuse
3. **Implement cleanup jobs** to remove old anonymous user data periodically
4. **Monitor usage** to ensure anonymous users aren't consuming excessive resources
5. **Consider conversion flows** to encourage anonymous users to create permanent accounts