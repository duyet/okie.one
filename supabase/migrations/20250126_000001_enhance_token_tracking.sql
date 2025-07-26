-- Migration: Enhance token tracking with cached tokens and detailed timing
-- Created: 2025-01-26
-- Description: Adds support for cached tokens, detailed timing metrics, and historical pricing

-- Add new columns to token_usage table
ALTER TABLE token_usage 
ADD COLUMN IF NOT EXISTS cached_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_to_first_token_ms INTEGER,
ADD COLUMN IF NOT EXISTS time_to_first_chunk_ms INTEGER,
ADD COLUMN IF NOT EXISTS streaming_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS cost_per_input_token_usd DECIMAL(12, 8),
ADD COLUMN IF NOT EXISTS cost_per_output_token_usd DECIMAL(12, 8);

-- Update total_tokens to include cached tokens
ALTER TABLE token_usage DROP COLUMN IF EXISTS total_tokens;
ALTER TABLE token_usage 
ADD COLUMN total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens + COALESCE(cached_tokens, 0)) STORED;

-- Add cached tokens to daily aggregation
ALTER TABLE daily_token_usage 
ADD COLUMN IF NOT EXISTS total_cached_tokens INTEGER DEFAULT 0;

-- Update daily total_tokens to include cached tokens
ALTER TABLE daily_token_usage DROP COLUMN IF EXISTS total_tokens;
ALTER TABLE daily_token_usage 
ADD COLUMN total_tokens INTEGER GENERATED ALWAYS AS (total_input_tokens + total_output_tokens + COALESCE(total_cached_tokens, 0)) STORED;

-- Create index for cached tokens
CREATE INDEX IF NOT EXISTS idx_token_usage_cached_tokens ON token_usage(cached_tokens);

-- Create index for timing metrics
CREATE INDEX IF NOT EXISTS idx_token_usage_timing ON token_usage(time_to_first_token_ms, time_to_first_chunk_ms);

-- Update the daily aggregation function to include cached tokens and timing
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

-- Update leaderboard function to include cached tokens
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
      AND tu.created_at >= CURRENT_DATE - INTERVAL '%s days'
    GROUP BY DATE(tu.created_at)
    ORDER BY usage_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for new columns
COMMENT ON COLUMN token_usage.cached_tokens IS 'Number of cached tokens used (if supported by provider)';
COMMENT ON COLUMN token_usage.time_to_first_token_ms IS 'Time to receive first token from AI provider';
COMMENT ON COLUMN token_usage.time_to_first_chunk_ms IS 'Time to receive first streaming chunk';
COMMENT ON COLUMN token_usage.streaming_duration_ms IS 'Total time for streaming response';
COMMENT ON COLUMN token_usage.cost_per_input_token_usd IS 'Historical cost per input token at time of request';
COMMENT ON COLUMN token_usage.cost_per_output_token_usd IS 'Historical cost per output token at time of request';

COMMENT ON FUNCTION get_timing_analytics IS 'Returns detailed timing analytics for a specific user over a date range';