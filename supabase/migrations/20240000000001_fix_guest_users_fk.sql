-- Migration to allow guest users to save data without auth.users dependency
-- This makes the foreign key constraints deferrable and adds policies for anonymous users

-- Step 1: Make the foreign key on users table deferrable
-- This allows us to insert into users table even if the auth.users entry doesn't exist yet
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 2: Create a trigger to auto-create anonymous users in auth.users if needed
-- This is a workaround for when anonymous auth is not properly configured
CREATE OR REPLACE FUNCTION public.ensure_auth_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process anonymous users
  IF NEW.anonymous = true THEN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
      -- Create a minimal entry in auth.users for anonymous users
      -- Note: This is a workaround and should be used with caution
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at
      ) VALUES (
        NEW.id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        COALESCE(NEW.email, NEW.id || '@anonymous.local'),
        '', -- No password for anonymous users
        NOW(),
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NOW(),
        jsonb_build_object('provider', 'anonymous', 'providers', ARRAY['anonymous']),
        jsonb_build_object('is_anonymous', true),
        false,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        '',
        NULL,
        '',
        0,
        NULL,
        '',
        NULL,
        false,
        NULL
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
DROP TRIGGER IF EXISTS ensure_auth_user_exists_trigger ON public.users;
CREATE TRIGGER ensure_auth_user_exists_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_auth_user_exists();

-- Step 3: Update RLS policies to allow anonymous users to create their own records
-- Allow anonymous users to insert their own user record
CREATE POLICY "Allow anonymous users to create their profile" ON public.users
  FOR INSERT
  WITH CHECK (
    id = auth.uid() OR 
    (anonymous = true AND auth.uid() IS NULL)
  );

-- Allow anonymous users to read their own profile
CREATE POLICY "Allow anonymous users to read their profile" ON public.users
  FOR SELECT
  USING (
    id = auth.uid() OR
    (anonymous = true AND id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Allow anonymous users to update their own profile
CREATE POLICY "Allow anonymous users to update their profile" ON public.users
  FOR UPDATE
  USING (
    id = auth.uid() OR
    (anonymous = true AND id = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Step 4: Update chats table policies for anonymous users
-- Allow anonymous users to create chats
CREATE POLICY "Allow anonymous users to create chats" ON public.chats
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND anonymous = true)
  );

-- Allow anonymous users to read their own chats
CREATE POLICY "Allow anonymous users to read their chats" ON public.chats
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND anonymous = true)
  );

-- Step 5: Update messages table policies for anonymous users
-- Allow anonymous users to create messages in their chats
CREATE POLICY "Allow anonymous users to create messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id 
      AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND anonymous = true))
    )
  );

-- Allow anonymous users to read messages in their chats
CREATE POLICY "Allow anonymous users to read messages" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id 
      AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND anonymous = true))
    )
  );

-- Step 6: Function to clean up orphaned anonymous auth.users entries (optional)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_anonymous_users()
RETURNS void AS $$
BEGIN
  -- Delete auth.users entries that were created by our trigger
  -- but don't have corresponding entries in public.users
  DELETE FROM auth.users
  WHERE raw_user_meta_data->>'is_anonymous' = 'true'
  AND NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.users.id
  )
  AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to clean up orphaned entries
-- You can run this manually or set up a cron job
-- SELECT cron.schedule('cleanup-orphaned-anonymous-users', '0 0 * * *', 'SELECT public.cleanup_orphaned_anonymous_users();');

-- Add comment explaining this migration
COMMENT ON FUNCTION public.ensure_auth_user_exists() IS 
'This function ensures that anonymous users can be created in public.users even when auth.users entry does not exist. 
This is a workaround for environments where anonymous authentication is not properly configured.
In production, it is recommended to use Supabase anonymous authentication instead.';