-- Migration: User Analytics and Daily Active Users (DAU) Tracking
-- Created: 2025-04-08
-- Description: Adds user event tracking and DAU aggregation for admin analytics dashboard

-- ============================================================================
-- USER EVENTS TABLE
-- ============================================================================
-- Tracks individual user events for detailed analytics and behavior analysis
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'chat_created', 'message_sent', 'model_changed', 'settings_updated'
    event_metadata JSONB DEFAULT '{}'::jsonb, -- Flexible metadata for different event types
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DAILY ACTIVE USERS TABLE
-- ============================================================================
-- Pre-aggregated DAU statistics for efficient dashboard queries
CREATE TABLE IF NOT EXISTS daily_active_users (
    date DATE PRIMARY KEY,
    total_users INTEGER NOT NULL DEFAULT 0,
    authenticated_users INTEGER NOT NULL DEFAULT 0,
    guest_users INTEGER NOT NULL DEFAULT 0,
    new_users INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- User events indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_date ON user_events((DATE(created_at)));

-- Daily active users index for date range queries
CREATE INDEX IF NOT EXISTS idx_daily_active_users_date ON daily_active_users(date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_active_users ENABLE ROW LEVEL SECURITY;

-- User events policies
CREATE POLICY "Service role full access user_events"
    ON user_events
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own events"
    ON user_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- Daily active users policies (service role only for admin analytics)
CREATE POLICY "Service role full access daily_active_users"
    ON daily_active_users
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- DAU CALCULATION FUNCTION
-- ============================================================================
-- Calculates and stores daily active users statistics
-- Should be run daily (e.g., via cron job or pg_cron extension)
CREATE OR REPLACE FUNCTION calculate_daily_active_users(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    v_total_users INTEGER;
    v_authenticated_users INTEGER;
    v_guest_users INTEGER;
    v_new_users INTEGER;
BEGIN
    -- Calculate DAU metrics from users table
    SELECT
        COUNT(DISTINCT u.id),
        COUNT(DISTINCT CASE WHEN u.anonymous = false THEN u.id END),
        COUNT(DISTINCT CASE WHEN u.anonymous = true THEN u.id END),
        COUNT(DISTINCT CASE WHEN DATE(u.created_at) = target_date THEN u.id END)
    INTO v_total_users, v_authenticated_users, v_guest_users, v_new_users
    FROM users u
    WHERE DATE(u.last_active_at) = target_date;

    -- Insert or update daily_active_users table
    INSERT INTO daily_active_users (
        date,
        total_users,
        authenticated_users,
        guest_users,
        new_users
    )
    VALUES (
        target_date,
        v_total_users,
        v_authenticated_users,
        v_guest_users,
        v_new_users
    )
    ON CONFLICT (date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        authenticated_users = EXCLUDED.authenticated_users,
        guest_users = EXCLUDED.guest_users,
        new_users = EXCLUDED.new_users,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET DAU TREND FUNCTION
-- ============================================================================
-- Returns DAU trend data for dashboard visualization
-- Fills in missing dates with zeros for continuous time series
CREATE OR REPLACE FUNCTION get_dau_trend(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    total_users INTEGER,
    authenticated_users INTEGER,
    guest_users INTEGER,
    new_users INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.date,
        COALESCE(dau.total_users, 0),
        COALESCE(dau.authenticated_users, 0),
        COALESCE(dau.guest_users, 0),
        COALESCE(dau.new_users, 0)
    FROM (
        -- Generate complete date series
        SELECT generate_series(
            CURRENT_DATE - ((days_back - 1) || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE as date
    ) d
    LEFT JOIN daily_active_users dau ON dau.date = d.date
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: RECORD USER EVENT
-- ============================================================================
-- Convenience function to record user events with automatic timestamps
CREATE OR REPLACE FUNCTION record_user_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO user_events (user_id, event_type, event_metadata)
    VALUES (p_user_id, p_event_type, p_event_metadata)
    RETURNING id INTO v_event_id;

    -- Update user's last_active_at timestamp
    UPDATE users
    SET last_active_at = NOW()
    WHERE id = p_user_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for daily_active_users
CREATE TRIGGER update_daily_active_users_updated_at
    BEFORE UPDATE ON daily_active_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- User events permissions
GRANT SELECT, INSERT ON user_events TO authenticated;
GRANT ALL ON user_events TO service_role;

-- Daily active users permissions (service role only)
GRANT ALL ON daily_active_users TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_daily_active_users TO service_role;
GRANT EXECUTE ON FUNCTION get_dau_trend TO service_role;
GRANT EXECUTE ON FUNCTION record_user_event TO authenticated, service_role;

-- ============================================================================
-- TABLE AND COLUMN COMMENTS
-- ============================================================================
COMMENT ON TABLE user_events IS 'Tracks individual user events for detailed analytics and behavior analysis';
COMMENT ON TABLE daily_active_users IS 'Pre-aggregated daily active users statistics for efficient dashboard queries';

COMMENT ON COLUMN user_events.event_type IS 'Type of event (e.g., chat_created, message_sent, model_changed, settings_updated)';
COMMENT ON COLUMN user_events.event_metadata IS 'Flexible JSONB metadata for event-specific data';

COMMENT ON COLUMN daily_active_users.total_users IS 'Total number of unique active users on this date';
COMMENT ON COLUMN daily_active_users.authenticated_users IS 'Number of authenticated (non-guest) active users';
COMMENT ON COLUMN daily_active_users.guest_users IS 'Number of guest/anonymous active users';
COMMENT ON COLUMN daily_active_users.new_users IS 'Number of users who created their account on this date';

COMMENT ON FUNCTION calculate_daily_active_users IS 'Calculates and stores daily active users statistics. Run daily via cron job.';
COMMENT ON FUNCTION get_dau_trend IS 'Returns DAU trend data for dashboard visualization with continuous date series';
COMMENT ON FUNCTION record_user_event IS 'Records a user event and updates last_active_at timestamp';

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created user_events table for event tracking';
    RAISE NOTICE 'Created daily_active_users table for DAU aggregation';
    RAISE NOTICE 'Added calculate_daily_active_users() function - run daily via cron';
    RAISE NOTICE 'Added get_dau_trend() function for dashboard data retrieval';
    RAISE NOTICE 'Added record_user_event() helper function for event logging';
    RAISE NOTICE 'All indexes, RLS policies, and permissions configured';
END $$;
