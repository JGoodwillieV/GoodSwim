-- =====================================================
-- STORMTRACKER PUSH NOTIFICATIONS SCHEMA
-- =====================================================
-- This schema supports push notifications, badge counts, and notification preferences

-- =====================================================
-- 1. PUSH SUBSCRIPTIONS TABLE
-- =====================================================
-- Stores push subscriptions per user/device
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL, -- Public key for encryption
    auth TEXT NOT NULL, -- Auth secret for encryption
    device_name TEXT, -- Optional: "James's iPhone", "Sarah's Android"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, endpoint)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- =====================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- =====================================================
-- Stores per-user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_brief BOOLEAN DEFAULT true,
    action_items BOOLEAN DEFAULT true,
    meet_reminders BOOLEAN DEFAULT true,
    meet_results BOOLEAN DEFAULT true,
    test_set_results BOOLEAN DEFAULT true,
    practice_updates BOOLEAN DEFAULT true,
    quiet_hours_start TIME, -- e.g., '22:00'
    quiet_hours_end TIME, -- e.g., '07:00'
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. USER BADGE COUNTS TABLE
-- =====================================================
-- Tracks unread notification counts for badge display
CREATE TABLE IF NOT EXISTS user_badge_counts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    last_cleared_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. NOTIFICATION HISTORY TABLE (Optional but recommended)
-- =====================================================
-- Tracks sent notifications for debugging and analytics
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    url TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badge_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Push Subscriptions Policies
DROP POLICY IF EXISTS "Users manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own subscriptions" 
    ON push_subscriptions 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Notification Preferences Policies
DROP POLICY IF EXISTS "Users manage own preferences" ON notification_preferences;
CREATE POLICY "Users manage own preferences" 
    ON notification_preferences 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Badge Counts Policies
DROP POLICY IF EXISTS "Users see own badge count" ON user_badge_counts;
CREATE POLICY "Users see own badge count" 
    ON user_badge_counts 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own badge count" ON user_badge_counts;
CREATE POLICY "Users update own badge count" 
    ON user_badge_counts 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Notification History Policies
DROP POLICY IF EXISTS "Users see own notification history" ON notification_history;
CREATE POLICY "Users see own notification history" 
    ON notification_history 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- =====================================================
-- 6. DATABASE FUNCTIONS
-- =====================================================

-- Function to increment badge counts for multiple users
CREATE OR REPLACE FUNCTION increment_badge_counts(user_ids UUID[])
RETURNS void AS $$
BEGIN
    INSERT INTO user_badge_counts (user_id, unread_count)
    SELECT unnest(user_ids), 1
    ON CONFLICT (user_id)
    DO UPDATE SET unread_count = user_badge_counts.unread_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear badge count for a user
CREATE OR REPLACE FUNCTION clear_badge_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_badge_counts (user_id, unread_count, last_cleared_at)
    VALUES (p_user_id, 0, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET 
        unread_count = 0,
        last_cleared_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if notification should be sent (respects quiet hours)
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_preferences RECORD;
    v_current_time TIME;
    v_should_send BOOLEAN := true;
BEGIN
    -- Get user preferences
    SELECT * INTO v_preferences 
    FROM notification_preferences 
    WHERE user_id = p_user_id;
    
    -- If no preferences found, allow by default
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- Check if this notification type is enabled
    CASE p_notification_type
        WHEN 'daily_brief' THEN v_should_send := v_preferences.daily_brief;
        WHEN 'action_items' THEN v_should_send := v_preferences.action_items;
        WHEN 'meet_reminders' THEN v_should_send := v_preferences.meet_reminders;
        WHEN 'meet_results' THEN v_should_send := v_preferences.meet_results;
        WHEN 'test_set_results' THEN v_should_send := v_preferences.test_set_results;
        WHEN 'practice_updates' THEN v_should_send := v_preferences.practice_updates;
        ELSE v_should_send := true;
    END CASE;
    
    IF NOT v_should_send THEN
        RETURN false;
    END IF;
    
    -- Check quiet hours
    IF v_preferences.quiet_hours_start IS NOT NULL AND v_preferences.quiet_hours_end IS NOT NULL THEN
        v_current_time := CURRENT_TIME;
        
        -- Handle quiet hours that span midnight
        IF v_preferences.quiet_hours_start > v_preferences.quiet_hours_end THEN
            IF v_current_time >= v_preferences.quiet_hours_start OR v_current_time < v_preferences.quiet_hours_end THEN
                RETURN false;
            END IF;
        ELSE
            -- Normal quiet hours (same day)
            IF v_current_time >= v_preferences.quiet_hours_start AND v_current_time < v_preferences.quiet_hours_end THEN
                RETURN false;
            END IF;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-update timestamp on notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_notification_preferences_timestamp ON notification_preferences;
CREATE TRIGGER trg_update_notification_preferences_timestamp
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_timestamp();

-- Auto-update last_used_at on push_subscriptions
CREATE OR REPLACE FUNCTION update_push_subscription_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_push_subscription_last_used ON push_subscriptions;
CREATE TRIGGER trg_update_push_subscription_last_used
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscription_last_used();

