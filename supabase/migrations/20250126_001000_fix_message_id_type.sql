-- Fix message_id type inconsistency in token_usage table
-- Change from integer to TEXT to match frontend string IDs

-- Drop foreign key constraint temporarily
ALTER TABLE token_usage 
DROP CONSTRAINT IF EXISTS token_usage_message_id_fkey;

-- Change message_id column type to TEXT
ALTER TABLE token_usage 
ALTER COLUMN message_id TYPE TEXT USING message_id::TEXT;

-- Update any existing data that has integer format to string format
-- This assumes the existing integer IDs should be converted to strings
-- UPDATE token_usage SET message_id = 'msg-' || message_id WHERE message_id NOT LIKE 'msg-%';

-- Add comment explaining the change
COMMENT ON COLUMN token_usage.message_id IS 'Message ID as string (e.g., msg-xyz123), matches frontend format';

-- Note: Foreign key constraint not re-added as it depends on messages table ID format
-- Add back if messages table also uses TEXT IDs:
-- ALTER TABLE token_usage 
-- ADD CONSTRAINT token_usage_message_id_fkey 
-- FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;