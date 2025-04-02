-- Enable Row Level Security on the tables
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- chat_attachments Policies

-- SELECT: Only allow users to see their own attachments.
CREATE POLICY select_own_chat_attachments
ON public.chat_attachments
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Only allow inserting an attachment if the record's user_id matches auth.uid.
CREATE POLICY insert_own_chat_attachments
ON public.chat_attachments
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- DELETE: Only allow deletion if the attachment belongs to the authenticated user.
CREATE POLICY delete_own_chat_attachments
ON public.chat_attachments
FOR DELETE
USING (user_id = auth.uid());

-- (No UPDATE policy is created, effectively disallowing updates.)

-- chats Policies
-- ✅ Clean slate
DROP POLICY IF EXISTS allow_all_chats ON public.chats;
DROP POLICY IF EXISTS select_own_chats ON public.chats;
DROP POLICY IF EXISTS insert_chats ON public.chats;
DROP POLICY IF EXISTS update_own_chats ON public.chats;
DROP POLICY IF EXISTS delete_own_chats ON public.chats;

-- ✅ SELECT: Users can only read their own chats
CREATE POLICY select_own_chats
ON public.chats
FOR SELECT
TO public, authenticated
USING (
EXISTS (
SELECT 1 FROM public.users u
WHERE u.id = user_id
AND (
(current_setting('request.jwt.claim.sub', true) IS NULL AND u.anonymous = true)
OR (current_setting('request.jwt.claim.sub', true) = u.id::text)
)
)
);

-- ✅ INSERT: Only if user exists in users table (auth or guest)
CREATE POLICY insert_chats
ON public.chats
FOR INSERT
TO public, authenticated
WITH CHECK (
EXISTS (
SELECT 1 FROM public.users u
WHERE u.id = user_id
)
);

-- ✅ UPDATE: Only owner can update
CREATE POLICY update_own_chats
ON public.chats
FOR UPDATE
TO public, authenticated
USING (
EXISTS (
SELECT 1 FROM public.users u
WHERE u.id = user_id
AND (
(current_setting('request.jwt.claim.sub', true) IS NULL AND u.anonymous = true)
OR (current_setting('request.jwt.claim.sub', true) = u.id::text)
)
)
)
WITH CHECK (
EXISTS (
SELECT 1 FROM public.users u
WHERE u.id = user_id
AND (
(current_setting('request.jwt.claim.sub', true) IS NULL AND u.anonymous = true)
OR (current_setting('request.jwt.claim.sub', true) = u.id::text)
)
)
);

-- ✅ DELETE: Only owner can delete
CREATE POLICY delete_own_chats
ON public.chats
FOR DELETE
TO public, authenticated
USING (
EXISTS (
SELECT 1 FROM public.users u
WHERE u.id = user_id
AND (
(current_setting('request.jwt.claim.sub', true) IS NULL AND u.anonymous = true)
OR (current_setting('request.jwt.claim.sub', true) = u.id::text)
)
)
);

-- messages Policies

-- SELECT: Allow access only to messages that belong to chats owned by the user.
CREATE POLICY select_messages_in_own_chats
ON public.messages
FOR SELECT
USING (
EXISTS (
SELECT 1 FROM public.chats c
WHERE c.id = chat_id AND c.user_id = auth.uid()
)
);

-- INSERT: For user-generated messages, ensure the chat belongs to the authenticated user.
-- (AI-generated messages inserted via a trusted service role will bypass RLS.)
CREATE POLICY insert_messages_in_own_chats
ON public.messages
FOR INSERT
WITH CHECK (
EXISTS (
SELECT 1 FROM public.chats c
WHERE c.id = chat_id AND c.user_id = auth.uid()
)
);

-- UPDATE: Allow users to update only their own (user-sent) messages.
CREATE POLICY update_own_messages
ON public.messages
FOR UPDATE
USING (
sender = 'user' AND
EXISTS (
SELECT 1 FROM public.chats c
WHERE c.id = chat_id AND c.user_id = auth.uid()
)
)
WITH CHECK (sender = 'user');

-- DELETE: Allow users to delete only their own messages.
CREATE POLICY delete_own_messages
ON public.messages
FOR DELETE
USING (
sender = 'user' AND
EXISTS (
SELECT 1 FROM public.chats c
WHERE c.id = chat_id AND c.user_id = auth.uid()
)
);

-- users Policies

-- Drop any existing policies on the users table
DROP POLICY IF EXISTS select_own_user ON public.users;
DROP POLICY IF EXISTS update_own_user ON public.users;
DROP POLICY IF EXISTS insert_users_authenticated ON public.users;
DROP POLICY IF EXISTS insert_users_guest ON public.users;
DROP POLICY IF EXISTS no_delete_users ON public.users;

---

## -- SELECT: Allow authenticated users to read only their own record.

CREATE POLICY select_own_user
ON public.users
FOR SELECT
USING (
current_setting('request.jwt.claim.sub', true) IS NOT NULL
AND id::text = current_setting('request.jwt.claim.sub', true)
);

---

-- UPDATE: Permit updates only on the user’s own record,
-- and restrict modifications to sensitive columns.

---

CREATE POLICY update_own_user
ON public.users
FOR UPDATE
USING (
current_setting('request.jwt.claim.sub', true) IS NOT NULL
AND id::text = current_setting('request.jwt.claim.sub', true)
)
WITH CHECK (
current_setting('request.jwt.claim.sub', true) IS NOT NULL
AND id::text = current_setting('request.jwt.claim.sub', true)
AND (daily_message_count = (SELECT u.daily_message_count FROM public.users u WHERE u.id = id))
AND (message_count = (SELECT u.message_count FROM public.users u WHERE u.id = id))
AND (daily_reset = (SELECT u.daily_reset FROM public.users u WHERE u.id = id))
);

---

-- INSERT Policy for Authenticated Users:
-- Allow only if the new record's id matches the JWT claim.

---

CREATE POLICY insert_users_authenticated
ON public.users
FOR INSERT
WITH CHECK (
current_setting('request.jwt.claim.sub', true) IS NOT NULL
AND id::text = current_setting('request.jwt.claim.sub', true)
);

---

-- INSERT Policy for Guest Users:
-- Allow if no JWT is present and the row is flagged as anonymous.

---

CREATE POLICY insert_users_guest
ON public.users
FOR INSERT
WITH CHECK (
(current_setting('request.jwt.claim.sub', true) IS NULL OR current_setting('request.jwt.claim.sub', true) = '')
AND anonymous = true
);

---

## -- DELETE Policy: Disable deletion for non-admins.

CREATE POLICY no_delete_users
ON public.users
FOR DELETE
USING (false);
