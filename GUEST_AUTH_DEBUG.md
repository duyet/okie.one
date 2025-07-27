# Guest Authentication Debug Guide

## Quick Test

Open your browser console and run these commands one by one:

### 1. Check if anonymous auth is working:

```javascript
// Test anonymous sign-in
const { createClient } = await import('./lib/supabase/client.ts');
const supabase = createClient();
const { data, error } = await supabase.auth.signInAnonymously();
console.log('Anonymous sign-in result:', { data, error });
```

If you see an error, anonymous sign-ins are not enabled properly.

### 2. Check current session:

```javascript
const { data: session } = await supabase.auth.getSession();
console.log('Current session:', session);
```

### 3. Check localStorage:

```javascript
console.log('Guest IDs in storage:', {
  fallback: localStorage.getItem('fallback-guest-id'),
  guestUser: localStorage.getItem('guest-user-id'),
});
```

## Common Issues and Solutions

### Issue 1: "Anonymous sign-in failed"

**Solution**: 
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Authentication → Providers
4. Find "Anonymous Sign-Ins" and toggle it ON
5. Save changes
6. Wait 1-2 minutes for changes to propagate
7. Refresh your app and try again

### Issue 2: Foreign key constraint error

**Symptom**: Error message like "insert or update on table 'users' violates foreign key constraint"

**Solution**: This happens when trying to create a guest user without proper auth. After enabling anonymous sign-ins, clear your browser data and try again.

### Issue 3: Guest user exists but can't save messages

**Check**:
1. Is the guest user ID a proper UUID? (not "guest-user-xxx")
2. Does the user exist in auth.users? (only possible with anonymous auth)
3. Does the user exist in public.users table?

## Manual Fix

If anonymous auth is not working, you can manually test by:

1. Clear all browser data for the site
2. Open in incognito/private window
3. Open browser console
4. Watch for any errors when loading the page
5. Try sending a message and check for errors

## What Should Happen

When everything is working correctly:

1. Page loads → `signInAnonymously()` is called
2. Supabase creates an anonymous user in `auth.users`
3. App creates corresponding entry in `public.users`
4. Guest user can send messages that are saved to database
5. Messages persist across page refreshes

## Still Not Working?

Please share:
1. The exact error messages from browser console
2. The output of the test commands above
3. Whether anonymous sign-ins show as enabled in Supabase Dashboard