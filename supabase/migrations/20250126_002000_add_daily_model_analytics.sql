-- Migration: Add function for daily token usage analytics by model
-- Created: 2025-01-26
-- Description: Adds function to get daily token usage grouped by model for chart visualization

-- Create function to get daily token usage by model for charts
CREATE OR REPLACE FUNCTION get_daily_token_usage_by_model(
    days_back INTEGER DEFAULT 30,
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    usage_date DATE,
    model_id TEXT,
    provider_id TEXT,
    model_name TEXT,
    total_tokens BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cached_tokens BIGINT,
    message_count INTEGER,
    total_cost_usd DECIMAL(10, 6)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dtu.usage_date,
        dtu.model_id,
        dtu.provider_id,
        -- Create a human-readable model name
        CASE 
            WHEN dtu.provider_id = 'openai' THEN 
                CASE 
                    WHEN dtu.model_id LIKE '%gpt-4o%' THEN 'GPT-4o'
                    WHEN dtu.model_id LIKE '%gpt-4o-mini%' THEN 'GPT-4o Mini'
                    WHEN dtu.model_id LIKE '%gpt-4%' THEN 'GPT-4'
                    WHEN dtu.model_id LIKE '%gpt-3.5%' THEN 'GPT-3.5'
                    ELSE UPPER(SUBSTRING(dtu.model_id, 1, 20))
                END
            WHEN dtu.provider_id = 'anthropic' THEN 
                CASE 
                    WHEN dtu.model_id LIKE '%claude-3.5-sonnet%' THEN 'Claude 3.5 Sonnet'
                    WHEN dtu.model_id LIKE '%claude-3-haiku%' THEN 'Claude 3 Haiku'
                    WHEN dtu.model_id LIKE '%claude-3-opus%' THEN 'Claude 3 Opus'
                    WHEN dtu.model_id LIKE '%claude-3%' THEN 'Claude 3'
                    ELSE UPPER(SUBSTRING(dtu.model_id, 1, 20))
                END
            WHEN dtu.provider_id = 'google' THEN 
                CASE 
                    WHEN dtu.model_id LIKE '%gemini-1.5-pro%' THEN 'Gemini 1.5 Pro'
                    WHEN dtu.model_id LIKE '%gemini-1.5-flash%' THEN 'Gemini 1.5 Flash'
                    WHEN dtu.model_id LIKE '%gemini%' THEN 'Gemini'
                    ELSE UPPER(SUBSTRING(dtu.model_id, 1, 20))
                END
            WHEN dtu.provider_id = 'mistral' THEN 
                CASE 
                    WHEN dtu.model_id LIKE '%large%' THEN 'Mistral Large'
                    WHEN dtu.model_id LIKE '%small%' THEN 'Mistral Small'
                    ELSE UPPER(SUBSTRING(dtu.model_id, 1, 20))
                END
            ELSE 
                UPPER(SUBSTRING(dtu.model_id, 1, 20))
        END AS model_name,
        dtu.total_tokens::BIGINT as total_tokens,
        dtu.total_input_tokens::BIGINT as total_input_tokens,
        dtu.total_output_tokens::BIGINT as total_output_tokens,
        COALESCE(dtu.total_cached_tokens, 0)::BIGINT as total_cached_tokens,
        dtu.message_count::INTEGER as message_count,
        COALESCE(dtu.estimated_cost_usd, 0) as total_cost_usd
    FROM daily_token_usage dtu
    WHERE dtu.usage_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
      AND (target_user_id IS NULL OR dtu.user_id = target_user_id)
      AND dtu.total_tokens > 0  -- Only include days with actual usage
    ORDER BY dtu.usage_date ASC, dtu.total_tokens DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get aggregated daily token usage by model (for stacked bar chart)
CREATE OR REPLACE FUNCTION get_daily_model_token_summary(
    days_back INTEGER DEFAULT 30,
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    usage_date DATE,
    model_data JSONB,
    daily_total_tokens BIGINT,
    daily_total_messages INTEGER,
    daily_total_cost DECIMAL(10, 6)
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_aggregates AS (
        SELECT 
            dtu.usage_date,
            -- Create model key for aggregation
            CASE 
                WHEN dtu.provider_id = 'openai' THEN 
                    CASE 
                        WHEN dtu.model_id LIKE '%gpt-4o-mini%' THEN 'GPT-4o Mini'
                        WHEN dtu.model_id LIKE '%gpt-4o%' THEN 'GPT-4o'
                        WHEN dtu.model_id LIKE '%gpt-4%' THEN 'GPT-4'
                        WHEN dtu.model_id LIKE '%gpt-3.5%' THEN 'GPT-3.5'
                        ELSE 'OpenAI Other'
                    END
                WHEN dtu.provider_id = 'anthropic' THEN 
                    CASE 
                        WHEN dtu.model_id LIKE '%claude-3.5-sonnet%' THEN 'Claude 3.5 Sonnet'
                        WHEN dtu.model_id LIKE '%claude-3-haiku%' THEN 'Claude 3 Haiku'
                        WHEN dtu.model_id LIKE '%claude-3-opus%' THEN 'Claude 3 Opus'
                        WHEN dtu.model_id LIKE '%claude-3%' THEN 'Claude 3'
                        ELSE 'Claude Other'
                    END
                WHEN dtu.provider_id = 'google' THEN 
                    CASE 
                        WHEN dtu.model_id LIKE '%gemini-1.5-pro%' THEN 'Gemini 1.5 Pro'
                        WHEN dtu.model_id LIKE '%gemini-1.5-flash%' THEN 'Gemini 1.5 Flash'
                        WHEN dtu.model_id LIKE '%gemini%' THEN 'Gemini'
                        ELSE 'Google Other'
                    END
                WHEN dtu.provider_id = 'mistral' THEN 
                    CASE 
                        WHEN dtu.model_id LIKE '%large%' THEN 'Mistral Large'
                        WHEN dtu.model_id LIKE '%small%' THEN 'Mistral Small'
                        ELSE 'Mistral Other'
                    END
                ELSE 
                    INITCAP(dtu.provider_id) || ' Other'
            END AS model_display_name,
            SUM(dtu.total_tokens) as model_total_tokens,
            SUM(dtu.message_count) as model_message_count,
            SUM(COALESCE(dtu.estimated_cost_usd, 0)) as model_total_cost
        FROM daily_token_usage dtu
        WHERE dtu.usage_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
          AND (target_user_id IS NULL OR dtu.user_id = target_user_id)
          AND dtu.total_tokens > 0
        GROUP BY dtu.usage_date, model_display_name
    )
    SELECT 
        da.usage_date,
        jsonb_object_agg(
            da.model_display_name, 
            jsonb_build_object(
                'tokens', da.model_total_tokens,
                'messages', da.model_message_count,
                'cost', da.model_total_cost
            )
        ) as model_data,
        SUM(da.model_total_tokens)::BIGINT as daily_total_tokens,
        SUM(da.model_message_count)::INTEGER as daily_total_messages,
        SUM(da.model_total_cost) as daily_total_cost
    FROM daily_aggregates da
    GROUP BY da.usage_date
    ORDER BY da.usage_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_daily_token_usage_by_model TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_model_token_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_token_usage_by_model TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_model_token_summary TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_daily_token_usage_by_model IS 'Returns daily token usage data grouped by model for detailed analytics';
COMMENT ON FUNCTION get_daily_model_token_summary IS 'Returns aggregated daily token usage with model data in JSON format for chart visualization';