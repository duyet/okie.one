# Anonymous Authentication Setup Guide

This guide explains how to enable anonymous/guest user authentication in Supabase for the Okie application.

## Problem

The application supports guest users, but the `users` table in Supabase has a foreign key constraint to `auth.users`. This means every user in the public `users` table must have a corresponding entry in the Supabase auth system. Without anonymous authentication enabled, fallback guest users (using local UUIDs) cannot save their data to the database.

## Solution

Enable Anonymous Sign-Ins in your Supabase project to allow guest users to authenticate properly.

## Steps to Enable Anonymous Authentication

### 1. Enable in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers** 
4. Scroll down to find **Anonymous Sign-Ins**
5. Toggle **Enable Anonymous Sign-Ins** to **ON**
6. Click **Save**

### 2. How It Works

When anonymous sign-ins are enabled:

1. The client-side code calls `supabase.auth.signInAnonymously()`
2. Supabase creates a real user in `auth.users` with `is_anonymous = true`
3. This user has a proper UUID that satisfies the foreign key constraint
4. The application can then create a corresponding entry in the public `users` table
5. Guest users can save messages, preferences, and maintain chat history

### 3. Fallback Behavior

If anonymous sign-ins are disabled or fail:

1. The app generates a local UUID for the guest user
2. This UUID is stored in localStorage for persistence
3. The user can still use the chat interface
4. However, their messages and data **cannot be saved to the database**
5. The console will show: "Fallback guest user detected. These users should use client-side anonymous auth."

### 4. Testing

After enabling anonymous sign-ins:

1. Open the app in an incognito/private browser window
2. Check the browser console for any errors
3. Send a test message
4. Verify the message persists after page refresh
5. Check that no foreign key constraint errors appear in the console

### 5. Security Considerations

- Anonymous users are real Supabase auth users with limited permissions
- They can only access their own data (enforced by Row Level Security)
- Anonymous sessions expire based on your Supabase project settings
- Consider implementing rate limiting for anonymous users

### 6. Troubleshooting

**Error: "insert or update on table 'users' violates foreign key constraint"**
- This means anonymous sign-ins are not enabled or not working properly
- Follow the steps above to enable anonymous authentication

**Error: "Invalid guest user ID format"**
- The app detected an old format guest ID (guest-user-xxx)
- The user should refresh the page to get a new UUID format ID

**Guest users can't save data**
- Check that anonymous sign-ins are enabled in Supabase
- Verify the Supabase environment variables are correctly configured
- Check browser console for specific error messages

## Related Files

- `/lib/api.ts` - Client-side guest user creation and anonymous auth
- `/lib/server/api.ts` - Server-side user validation
- `/lib/user/guest-fingerprint.ts` - Device fingerprinting for guest persistence
- `/app/components/guest/` - Guest user UI components