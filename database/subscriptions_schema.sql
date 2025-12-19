-- GoodSwim Stripe Billing Schema
-- Run this in Supabase SQL Editor

-- 1. SUBSCRIPTIONS TABLE
-- Stores team subscription status and Stripe references
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Stripe References
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Subscription Status
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'canceled', 'unpaid', 'past_due', 'incomplete')),
    tier TEXT NOT NULL DEFAULT 'trial' CHECK (tier IN ('trial', 'starter', 'pro', 'club')),
    
    -- Billing Cycle
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- 2. FEATURE LIMITS TABLE
-- Defines what each tier can access
CREATE TABLE IF NOT EXISTS feature_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier TEXT NOT NULL UNIQUE CHECK (tier IN ('trial', 'starter', 'pro', 'club')),
    
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

-- 3. INSERT DEFAULT FEATURE LIMITS
INSERT INTO feature_limits (tier, max_swimmers, max_coaches, manual_entry, sd3_import, csv_import, basic_calendar, parent_portal, parent_portal_readonly, push_notifications, practice_builder, trophy_case, team_records, ai_video_analysis, ai_video_monthly_limit, ai_chat, meet_reports, advanced_analytics, custom_branding)
VALUES 
    -- Trial: Limited to get them hooked
    ('trial', 25, 1, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 0, FALSE, FALSE, FALSE, FALSE),
    
    -- Starter ($1/mo): Basic coaching needs
    ('starter', NULL, 1, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 0, FALSE, FALSE, FALSE, FALSE),
    
    -- Pro ($3/mo): Power features
    ('pro', NULL, 3, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, FALSE, 0, TRUE, TRUE, FALSE, FALSE),
    
    -- Club ($5/mo): Everything + AI
    ('club', NULL, NULL, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE, 10, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (tier) DO UPDATE SET
    max_swimmers = EXCLUDED.max_swimmers,
    max_coaches = EXCLUDED.max_coaches,
    manual_entry = EXCLUDED.manual_entry,
    sd3_import = EXCLUDED.sd3_import,
    csv_import = EXCLUDED.csv_import,
    basic_calendar = EXCLUDED.basic_calendar,
    parent_portal = EXCLUDED.parent_portal,
    parent_portal_readonly = EXCLUDED.parent_portal_readonly,
    push_notifications = EXCLUDED.push_notifications,
    practice_builder = EXCLUDED.practice_builder,
    trophy_case = EXCLUDED.trophy_case,
    team_records = EXCLUDED.team_records,
    ai_video_analysis = EXCLUDED.ai_video_analysis,
    ai_video_monthly_limit = EXCLUDED.ai_video_monthly_limit,
    ai_chat = EXCLUDED.ai_chat,
    meet_reports = EXCLUDED.meet_reports,
    advanced_analytics = EXCLUDED.advanced_analytics,
    custom_branding = EXCLUDED.custom_branding;

-- 4. ROW LEVEL SECURITY
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_limits ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can only see their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" 
    ON subscriptions FOR SELECT 
    USING (team_id = auth.uid());

-- Subscriptions: Only service role can modify (webhooks)
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" 
    ON subscriptions FOR ALL 
    USING (auth.role() = 'service_role');

-- Feature limits: Everyone can read (needed for UI)
DROP POLICY IF EXISTS "Anyone can view feature limits" ON feature_limits;
CREATE POLICY "Anyone can view feature limits" 
    ON feature_limits FOR SELECT 
    USING (TRUE);

-- 5. AUTO-UPDATE TIMESTAMP TRIGGER
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

-- 6. HELPER FUNCTION: Get effective tier for a user
CREATE OR REPLACE FUNCTION get_effective_tier(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    sub_record RECORD;
    effective_tier TEXT;
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

-- 7. AUTO-CREATE SUBSCRIPTION ON USER SIGNUP
-- This function creates a trial subscription when a new user signs up
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create for coach role
    IF NEW.role = 'coach' THEN
        INSERT INTO subscriptions (team_id, status, tier, trial_end)
        VALUES (NEW.id, 'trialing', 'trial', NOW() + INTERVAL '14 days')
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_trial_subscription ON user_profiles;
CREATE TRIGGER trg_create_trial_subscription
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_trial_subscription();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON feature_limits TO anon, authenticated;
GRANT SELECT ON subscriptions TO authenticated;

