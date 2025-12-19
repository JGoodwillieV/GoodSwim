-- GoodSwim Stripe Billing Schema
-- Run this in Supabase SQL Editor
-- This script handles both fresh installs and updates to existing tables

-- =====================================================
-- STEP 1: SUBSCRIPTIONS TABLE
-- =====================================================

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    
    -- Stripe References
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    -- Subscription Status
    status TEXT NOT NULL DEFAULT 'trialing',
    tier TEXT NOT NULL DEFAULT 'trial',
    
    -- Billing Cycle
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Add unique constraints if they don't exist (ignore errors if they do)
DO $$ 
BEGIN
    -- Try to add unique constraint on team_id
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_team_id_key') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_team_id_key UNIQUE (team_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- =====================================================
-- STEP 2: DROP AND RECREATE FEATURE_LIMITS TABLE
-- (This is safe since it only contains static config data)
-- =====================================================

DROP TABLE IF EXISTS feature_limits CASCADE;

CREATE TABLE feature_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier TEXT NOT NULL UNIQUE,
    
    -- Swimmer/Coach Limits
    max_swimmers INTEGER,  -- NULL = unlimited
    max_coaches INTEGER DEFAULT 1,
    
    -- Core Features
    manual_entry BOOLEAN DEFAULT TRUE,
    sd3_import BOOLEAN DEFAULT FALSE,
    csv_import BOOLEAN DEFAULT FALSE,
    basic_calendar BOOLEAN DEFAULT TRUE,
    
    -- Parent Portal
    parent_portal BOOLEAN DEFAULT TRUE,
    parent_portal_readonly BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT FALSE,
    
    -- Advanced Features
    practice_builder BOOLEAN DEFAULT FALSE,
    trophy_case BOOLEAN DEFAULT FALSE,
    team_records BOOLEAN DEFAULT FALSE,
    
    -- AI Features
    ai_video_analysis BOOLEAN DEFAULT FALSE,
    ai_video_monthly_limit INTEGER DEFAULT 0,
    ai_chat BOOLEAN DEFAULT FALSE,
    
    -- Reports & Analytics
    meet_reports BOOLEAN DEFAULT FALSE,
    advanced_analytics BOOLEAN DEFAULT FALSE,
    custom_branding BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert feature limits for each tier
INSERT INTO feature_limits (tier, max_swimmers, max_coaches, manual_entry, sd3_import, csv_import, basic_calendar, parent_portal, parent_portal_readonly, push_notifications, practice_builder, trophy_case, team_records, ai_video_analysis, ai_video_monthly_limit, ai_chat, meet_reports, advanced_analytics, custom_branding)
VALUES 
    -- Trial: Limited to get them hooked
    ('trial', 25, 1, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 0, FALSE, FALSE, FALSE, FALSE),
    
    -- Starter ($1/mo): Basic coaching needs
    ('starter', NULL, 1, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 0, FALSE, FALSE, FALSE, FALSE),
    
    -- Pro ($3/mo): Power features
    ('pro', NULL, 3, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, FALSE, 0, TRUE, TRUE, FALSE, FALSE),
    
    -- Club ($5/mo): Everything + AI
    ('club', NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE, 10, TRUE, TRUE, TRUE, TRUE);

-- =====================================================
-- STEP 3: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_limits ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can only see their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" 
    ON subscriptions FOR SELECT 
    USING (team_id = auth.uid());

-- Subscriptions: Allow insert for authenticated users (for trial creation)
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription" 
    ON subscriptions FOR INSERT 
    WITH CHECK (team_id = auth.uid());

-- Feature limits: Everyone can read (needed for UI)
DROP POLICY IF EXISTS "Anyone can view feature limits" ON feature_limits;
CREATE POLICY "Anyone can view feature limits" 
    ON feature_limits FOR SELECT 
    USING (TRUE);

-- =====================================================
-- STEP 4: AUTO-UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_subscription_updated_at ON subscriptions;
CREATE TRIGGER trg_update_subscription_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- =====================================================
-- STEP 5: HELPER FUNCTION - Get effective tier
-- =====================================================

CREATE OR REPLACE FUNCTION get_effective_tier(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    sub_record RECORD;
BEGIN
    SELECT * INTO sub_record 
    FROM subscriptions 
    WHERE team_id = user_id 
    LIMIT 1;
    
    -- No subscription found
    IF sub_record IS NULL THEN
        RETURN 'trial';
    END IF;
    
    -- Check for expired trial
    IF sub_record.tier = 'trial' AND sub_record.trial_end < NOW() THEN
        RETURN 'expired';
    END IF;
    
    -- Check for canceled/unpaid status
    IF sub_record.status IN ('canceled', 'unpaid', 'past_due') THEN
        RETURN 'expired';
    END IF;
    
    RETURN sub_record.tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: AUTO-CREATE SUBSCRIPTION ON USER SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create for coach role
    IF NEW.role = 'coach' THEN
        INSERT INTO subscriptions (team_id, status, tier, trial_end)
        VALUES (NEW.id, 'trialing', 'trial', NOW() + INTERVAL '14 days')
        ON CONFLICT (team_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_trial_subscription ON user_profiles;
CREATE TRIGGER trg_create_trial_subscription
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_trial_subscription();

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON feature_limits TO anon, authenticated;
GRANT SELECT, INSERT ON subscriptions TO authenticated;

-- =====================================================
-- DONE! Your billing tables are ready.
-- =====================================================
