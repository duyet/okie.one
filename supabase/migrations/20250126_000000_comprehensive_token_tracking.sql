-- Migration: Comprehensive token usage tracking with detailed metrics
-- Created: 2025-01-26
-- Description: Adds tables to track AI token usage per message and user analytics with enhanced timing and pricing data

-- Create token_usage table for tracking individual message token usage
CREATE TABLE IF NOT EXISTS token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Provider and model information
    provider_id TEXT NOT NULL, -- openai, anthropic, google, etc.
    model_id TEXT NOT NULL,    -- gpt-4, claude-3, gemini-pro, etc.
    
    -- Token usage data
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0, -- Number of cached tokens used (if supported by provider)
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens + COALESCE(cached_tokens, 0)) STORED,
    
    -- Performance metrics
    duration_ms INTEGER, -- Request duration in milliseconds
    time_to_first_token_ms INTEGER, -- Time to receive first token from AI provider
    time_to_first_chunk_ms INTEGER, -- Time to receive first streaming chunk
    streaming_duration_ms INTEGER, -- Total time for streaming response
    
    -- Cost estimation with historical pricing
    estimated_cost_usd DECIMAL(10, 6), -- Cost in USD
    cost_per_input_token_usd DECIMAL(12, 8), -- Historical cost per input token at time of request
    cost_per_output_token_usd DECIMAL(12, 8), -- Historical cost per output token at time of request
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_token_usage table for aggregated daily statistics
CREATE TABLE IF NOT EXISTS daily_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Date and provider information
    usage_date DATE NOT NULL,
    provider_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    
    -- Aggregated token counts
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cached_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (total_input_tokens + total_output_tokens + COALESCE(total_cached_tokens, 0)) STORED,
    
    -- Usage statistics
    message_count INTEGER NOT NULL DEFAULT 0,
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    average_duration_ms INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN message_count > 0 THEN total_duration_ms / message_count
            ELSE 0
        END
    ) STORED,
    
    -- Cost estimation
    estimated_cost_usd DECIMAL(10, 6) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user/date/provider/model combination
    UNIQUE(user_id, usage_date, provider_id, model_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_chat_id ON token_usage(chat_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_message_id ON token_usage(message_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider_model ON token_usage(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_cached_tokens ON token_usage(cached_tokens);
CREATE INDEX IF NOT EXISTS idx_token_usage_timing ON token_usage(time_to_first_token_ms, time_to_first_chunk_ms);

CREATE INDEX IF NOT EXISTS idx_daily_token_usage_user_id ON daily_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_token_usage_date ON daily_token_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_token_usage_provider_model ON daily_token_usage(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_daily_token_usage_total_tokens ON daily_token_usage(total_tokens);

-- Create function to update daily aggregates when token usage is inserted
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update daily aggregates
CREATE TRIGGER trigger_update_daily_token_usage
    AFTER INSERT ON token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_token_usage();

-- Create function to get daily leaderboard
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
    total_cost_usd DECIMAL(10, 6),
    avg_duration_ms INTEGER,
    avg_time_to_first_token_ms INTEGER,
    top_provider TEXT,
    top_model TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dtu.user_id,
        SUM(dtu.total_tokens)::BIGINT as total_tokens,
        SUM(dtu.total_input_tokens)::BIGINT as total_input_tokens,
        SUM(dtu.total_output_tokens)::BIGINT as total_output_tokens,
        SUM(dtu.total_cached_tokens)::BIGINT as total_cached_tokens,
        SUM(dtu.message_count)::INTEGER as total_messages,
        SUM(dtu.estimated_cost_usd) as total_cost_usd,
        AVG(dtu.average_duration_ms)::INTEGER as avg_duration_ms,
        (
            SELECT AVG(tu.time_to_first_token_ms)::INTEGER
            FROM token_usage tu
            WHERE tu.user_id = dtu.user_id 
              AND DATE(tu.created_at) = target_date
              AND tu.time_to_first_token_ms IS NOT NULL
        ) as avg_time_to_first_token_ms,
        (
            SELECT provider_id 
            FROM daily_token_usage dtu2 
            WHERE dtu2.user_id = dtu.user_id 
              AND dtu2.usage_date = target_date
            ORDER BY total_tokens DESC 
            LIMIT 1
        ) as top_provider,
        (
            SELECT model_id 
            FROM daily_token_usage dtu3 
            WHERE dtu3.user_id = dtu.user_id 
              AND dtu3.usage_date = target_date
            ORDER BY total_tokens DESC 
            LIMIT 1
        ) as top_model
    FROM daily_token_usage dtu
    WHERE dtu.usage_date = target_date
    GROUP BY dtu.user_id
    ORDER BY total_tokens DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user token usage analytics
CREATE OR REPLACE FUNCTION get_user_token_analytics(
    target_user_id UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    usage_date DATE,
    total_tokens BIGINT,
    total_messages INTEGER,
    total_cost_usd DECIMAL(10, 6),
    providers JSONB,
    models JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dtu.usage_date,
        SUM(dtu.total_tokens)::BIGINT as total_tokens,
        SUM(dtu.message_count)::INTEGER as total_messages,
        SUM(dtu.estimated_cost_usd) as total_cost_usd,
        jsonb_agg(
            jsonb_build_object(
                'provider', dtu.provider_id,
                'tokens', dtu.total_tokens
            )
        ) as providers,
        jsonb_agg(
            jsonb_build_object(
                'model', dtu.model_id,
                'tokens', dtu.total_tokens
            )
        ) as models
    FROM daily_token_usage dtu
    WHERE dtu.user_id = target_user_id
      AND dtu.usage_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
    GROUP BY dtu.usage_date
    ORDER BY dtu.usage_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get detailed timing analytics
CREATE OR REPLACE FUNCTION get_timing_analytics(
    target_user_id UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    usage_date DATE,
    avg_duration_ms DECIMAL(10, 2),
    avg_time_to_first_token_ms DECIMAL(10, 2),
    avg_time_to_first_chunk_ms DECIMAL(10, 2),
    avg_streaming_duration_ms DECIMAL(10, 2),
    message_count INTEGER,
    provider_timings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(tu.created_at) as usage_date,
        AVG(tu.duration_ms) as avg_duration_ms,
        AVG(tu.time_to_first_token_ms) as avg_time_to_first_token_ms,
        AVG(tu.time_to_first_chunk_ms) as avg_time_to_first_chunk_ms,
        AVG(tu.streaming_duration_ms) as avg_streaming_duration_ms,
        COUNT(*)::INTEGER as message_count,
        jsonb_agg(
            jsonb_build_object(
                'provider', tu.provider_id,
                'model', tu.model_id,
                'avg_duration', AVG(tu.duration_ms),
                'avg_ttft', AVG(tu.time_to_first_token_ms)
            )
        ) as provider_timings
    FROM token_usage tu
    WHERE tu.user_id = target_user_id
      AND tu.created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
    GROUP BY DATE(tu.created_at)
    ORDER BY usage_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_token_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for token_usage
CREATE POLICY "Users can view their own token usage" 
    ON token_usage FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own token usage" 
    ON token_usage FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for daily_token_usage
CREATE POLICY "Users can view their own daily token usage" 
    ON daily_token_usage FOR SELECT 
    USING (auth.uid() = user_id);

-- Allow service role to insert/update for aggregation
CREATE POLICY "Service role can manage daily token usage" 
    ON daily_token_usage FOR ALL 
    USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT, INSERT ON token_usage TO authenticated;
GRANT SELECT ON daily_token_usage TO authenticated;
GRANT ALL ON token_usage TO service_role;
GRANT ALL ON daily_token_usage TO service_role;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_token_usage_updated_at
    BEFORE UPDATE ON token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_token_usage_updated_at
    BEFORE UPDATE ON daily_token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE token_usage IS 'Tracks AI token usage per individual message with detailed timing metrics';
COMMENT ON TABLE daily_token_usage IS 'Aggregated daily token usage statistics per user';
COMMENT ON FUNCTION get_daily_token_leaderboard IS 'Returns top users by token usage for a specific date with timing metrics';
COMMENT ON FUNCTION get_user_token_analytics IS 'Returns detailed token usage analytics for a specific user';
COMMENT ON FUNCTION get_timing_analytics IS 'Returns detailed timing analytics for a specific user over a date range';