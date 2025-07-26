-- Convert messages table from integer IDs to TEXT IDs
-- WARNING: This will truncate the messages table - ensure data backup if needed

-- Step 1: Drop dependent tables/constraints that reference messages.id
DROP TABLE IF EXISTS token_usage CASCADE;

-- Step 2: Drop foreign key constraints that reference messages.id
ALTER TABLE chat_attachments DROP CONSTRAINT IF EXISTS chat_attachments_source_message_id_fkey;

-- Step 3: Truncate messages table (as requested)
TRUNCATE TABLE messages CASCADE;

-- Step 4: Drop the old integer ID column and recreate as TEXT
ALTER TABLE messages DROP CONSTRAINT messages_pkey;
ALTER TABLE messages DROP COLUMN id;

-- Step 5: Create a function to generate URL-safe message IDs
CREATE OR REPLACE FUNCTION generate_message_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'msg-' || translate(encode(gen_random_bytes(12), 'base64'), '+/', '-_');
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add new TEXT id column as primary key
ALTER TABLE messages ADD COLUMN id TEXT PRIMARY KEY DEFAULT generate_message_id();

-- Step 7: Update chat_attachments.source_message_id to TEXT type
ALTER TABLE chat_attachments ALTER COLUMN source_message_id TYPE TEXT USING source_message_id::TEXT;

-- Step 8: Re-add foreign key constraint with TEXT reference
ALTER TABLE chat_attachments 
ADD CONSTRAINT chat_attachments_source_message_id_fkey 
FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Step 9: Recreate the token_usage table with TEXT message_id
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Provider and model information
    provider_id TEXT NOT NULL, -- openai, anthropic, google, etc.
    model_id TEXT NOT NULL,    -- gpt-4, claude-3, gemini-pro, etc.
    
    -- Token usage data
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens + COALESCE(cached_tokens, 0)) STORED,
    
    -- Performance metrics
    duration_ms INTEGER, -- Request duration in milliseconds
    time_to_first_token_ms INTEGER,
    time_to_first_chunk_ms INTEGER,
    streaming_duration_ms INTEGER,
    
    -- Cost estimation with historical pricing
    estimated_cost_usd DECIMAL(10, 6), -- Cost in USD
    cost_per_input_token_usd DECIMAL(12, 8),
    cost_per_output_token_usd DECIMAL(12, 8),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 21: Recreate daily_token_usage table (unchanged but recreate for consistency)
CREATE TABLE IF NOT EXISTS daily_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Date and provider information
    usage_date DATE NOT NULL,
    provider_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    
    -- Aggregated token counts
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_cached_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT GENERATED ALWAYS AS (total_input_tokens + total_output_tokens + COALESCE(total_cached_tokens, 0)) STORED,
    
    -- Aggregated metrics
    message_count INTEGER NOT NULL DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    
    -- Aggregated cost
    estimated_cost_usd DECIMAL(12, 6) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user/date/provider/model combination
    UNIQUE(user_id, usage_date, provider_id, model_id)
);

-- Step 19: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_chat_id ON token_usage(chat_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_message_id ON token_usage(message_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider_model ON token_usage(provider_id, model_id);

CREATE INDEX IF NOT EXISTS idx_daily_token_usage_user_id ON daily_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_token_usage_date ON daily_token_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_token_usage_provider_model ON daily_token_usage(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_daily_token_usage_total_tokens ON daily_token_usage(total_tokens);

-- Step 20: Recreate the trigger function for daily aggregation
CREATE OR REPLACE FUNCTION update_daily_token_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_token_usage (
        user_id,
        usage_date,
        provider_id,
        model_id,
        total_input_tokens,
        total_output_tokens,
        total_cached_tokens,
        message_count,
        total_duration_ms,
        estimated_cost_usd
    )
    VALUES (
        NEW.user_id,
        DATE(NEW.created_at),
        NEW.provider_id,
        NEW.model_id,
        NEW.input_tokens,
        NEW.output_tokens,
        COALESCE(NEW.cached_tokens, 0),
        1,
        COALESCE(NEW.duration_ms, 0),
        COALESCE(NEW.estimated_cost_usd, 0.00)
    )
    ON CONFLICT (user_id, usage_date, provider_id, model_id)
    DO UPDATE SET
        total_input_tokens = daily_token_usage.total_input_tokens + NEW.input_tokens,
        total_output_tokens = daily_token_usage.total_output_tokens + NEW.output_tokens,
        total_cached_tokens = daily_token_usage.total_cached_tokens + COALESCE(NEW.cached_tokens, 0),
        message_count = daily_token_usage.message_count + 1,
        total_duration_ms = daily_token_usage.total_duration_ms + COALESCE(NEW.duration_ms, 0),
        estimated_cost_usd = daily_token_usage.estimated_cost_usd + COALESCE(NEW.estimated_cost_usd, 0.00),
        updated_at = NOW();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 21: Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_daily_token_usage ON token_usage;
CREATE TRIGGER trigger_update_daily_token_usage
    AFTER INSERT ON token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_token_usage();

-- Step 19: Recreate utility functions
CREATE OR REPLACE FUNCTION get_daily_token_leaderboard(
    target_date DATE DEFAULT CURRENT_DATE,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    total_tokens BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cached_tokens BIGINT,
    total_messages INTEGER,
    total_cost_usd DECIMAL(12, 6),
    avg_duration_ms NUMERIC,
    avg_time_to_first_token_ms NUMERIC,
    top_provider TEXT,
    top_model TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dtu.user_id,
        SUM(dtu.total_tokens) as total_tokens,
        SUM(dtu.total_input_tokens) as total_input_tokens,
        SUM(dtu.total_output_tokens) as total_output_tokens,
        SUM(dtu.total_cached_tokens) as total_cached_tokens,
        SUM(dtu.message_count)::INTEGER as total_messages,
        SUM(dtu.estimated_cost_usd) as total_cost_usd,
        CASE 
            WHEN SUM(dtu.message_count) > 0 
            THEN (SUM(dtu.total_duration_ms)::NUMERIC / SUM(dtu.message_count)::NUMERIC)
            ELSE 0 
        END as avg_duration_ms,
        (
            SELECT AVG(tu.time_to_first_token_ms)::NUMERIC
            FROM token_usage tu 
            WHERE tu.user_id = dtu.user_id 
            AND DATE(tu.created_at) = target_date
        ) as avg_time_to_first_token_ms,
        (
            SELECT dtu2.provider_id
            FROM daily_token_usage dtu2 
            WHERE dtu2.user_id = dtu.user_id AND dtu2.usage_date = target_date
            ORDER BY dtu2.total_tokens DESC 
            LIMIT 1
        ) as top_provider,
        (
            SELECT dtu3.model_id
            FROM daily_token_usage dtu3 
            WHERE dtu3.user_id = dtu.user_id AND dtu3.usage_date = target_date
            ORDER BY dtu3.total_tokens DESC 
            LIMIT 1
        ) as top_model
    FROM daily_token_usage dtu
    WHERE dtu.usage_date = target_date
    GROUP BY dtu.user_id
    ORDER BY total_tokens DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_token_stats(
    target_user_id UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_tokens BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cached_tokens BIGINT,
    total_messages INTEGER,
    total_cost_usd DECIMAL(12, 6),
    avg_duration_ms NUMERIC,
    avg_time_to_first_token_ms NUMERIC,
    top_provider TEXT,
    top_model TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(dtu.total_tokens) as total_tokens,
        SUM(dtu.total_input_tokens) as total_input_tokens,
        SUM(dtu.total_output_tokens) as total_output_tokens,
        SUM(dtu.total_cached_tokens) as total_cached_tokens,
        SUM(dtu.message_count)::INTEGER as total_messages,
        SUM(dtu.estimated_cost_usd) as total_cost_usd,
        CASE 
            WHEN SUM(dtu.message_count) > 0 
            THEN (SUM(dtu.total_duration_ms)::NUMERIC / SUM(dtu.message_count)::NUMERIC)
            ELSE 0 
        END as avg_duration_ms,
        (
            SELECT AVG(tu.time_to_first_token_ms)::NUMERIC
            FROM token_usage tu 
            WHERE tu.user_id = target_user_id 
            AND DATE(tu.created_at) BETWEEN start_date AND end_date
        ) as avg_time_to_first_token_ms,
        (
            SELECT dtu2.provider_id
            FROM daily_token_usage dtu2 
            WHERE dtu2.user_id = target_user_id 
            AND dtu2.usage_date BETWEEN start_date AND end_date
            ORDER BY dtu2.total_tokens DESC 
            LIMIT 1
        ) as top_provider,
        (
            SELECT dtu3.model_id
            FROM daily_token_usage dtu3 
            WHERE dtu3.user_id = target_user_id 
            AND dtu3.usage_date BETWEEN start_date AND end_date
            ORDER BY dtu3.total_tokens DESC 
            LIMIT 1
        ) as top_model
    FROM daily_token_usage dtu
    WHERE dtu.user_id = target_user_id
    AND dtu.usage_date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Step 20: Enable RLS (Row Level Security)
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_token_usage ENABLE ROW LEVEL SECURITY;

-- Step 21: Create RLS policies
-- Token usage policies
CREATE POLICY "Users can view their own token usage" 
    ON token_usage FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage token usage" 
    ON token_usage FOR ALL 
    USING (auth.role() = 'service_role');

-- Daily token usage policies
CREATE POLICY "Users can view their own daily token usage" 
    ON daily_token_usage FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage daily token usage" 
    ON daily_token_usage FOR ALL 
    USING (auth.role() = 'service_role');

-- Step 19: Grant permissions
GRANT SELECT, INSERT ON token_usage TO authenticated;
GRANT SELECT ON daily_token_usage TO authenticated;
GRANT ALL ON token_usage TO service_role;
GRANT ALL ON daily_token_usage TO service_role;

-- Step 20: Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 21: Create updated_at triggers
CREATE TRIGGER update_token_usage_updated_at
    BEFORE UPDATE ON token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_token_usage_updated_at
    BEFORE UPDATE ON daily_token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 19: Add table comments
COMMENT ON TABLE token_usage IS 'Individual message token usage tracking with performance metrics';
COMMENT ON TABLE daily_token_usage IS 'Aggregated daily token usage statistics per user';
COMMENT ON COLUMN token_usage.message_id IS 'Message ID as TEXT (e.g., msg-xyz123), matches frontend format';
COMMENT ON COLUMN messages.id IS 'Message ID as TEXT with auto-generated format (msg-xxxxx)';

-- Step 20: Update messages table to use better default ID generation (already set above)
-- ALTER TABLE messages ALTER COLUMN id SET DEFAULT generate_message_id();

-- Step 21: Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Messages table now uses TEXT IDs with format: msg-xxxxx';
    RAISE NOTICE 'Token usage table updated to use TEXT message_id references';
    RAISE NOTICE 'All triggers, functions, and RLS policies recreated';
END $$;