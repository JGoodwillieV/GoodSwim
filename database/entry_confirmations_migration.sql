-- ============================================
-- ENTRY CONFIRMATIONS - MIGRATION SCRIPT
-- ============================================
-- This script adds missing constraints, indexes, policies, and functions
-- to an EXISTING entry_confirmations table
-- Safe to run - will not delete any data!
-- ============================================

-- ============================================
-- PART 1: ADD MISSING UNIQUE CONSTRAINT (if not exists)
-- ============================================
-- This is required for the upsert functionality
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_confirmation_per_swimmer_meet'
    ) THEN
        ALTER TABLE entry_confirmations 
        ADD CONSTRAINT unique_confirmation_per_swimmer_meet 
        UNIQUE (meet_id, swimmer_id, parent_id);
        RAISE NOTICE 'Added unique constraint';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- ============================================
-- PART 2: ADD MISSING INDEXES (if not exists)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_entry_confirmations_meet ON entry_confirmations(meet_id);
CREATE INDEX IF NOT EXISTS idx_entry_confirmations_swimmer ON entry_confirmations(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_entry_confirmations_parent ON entry_confirmations(parent_id);
CREATE INDEX IF NOT EXISTS idx_entry_confirmations_status ON entry_confirmations(status);

-- ============================================
-- PART 3: ENSURE ROW LEVEL SECURITY IS ENABLED
-- ============================================
ALTER TABLE entry_confirmations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 4: ADD/UPDATE RLS POLICIES
-- ============================================
-- Drop existing policies to recreate them (safe operation)
DROP POLICY IF EXISTS "Parents can view their own confirmations" ON entry_confirmations;
DROP POLICY IF EXISTS "Parents can manage their own confirmations" ON entry_confirmations;
DROP POLICY IF EXISTS "Coaches can view all confirmations" ON entry_confirmations;
DROP POLICY IF EXISTS "Coaches can update confirmations" ON entry_confirmations;

-- Parents can view their own confirmations
CREATE POLICY "Parents can view their own confirmations"
  ON entry_confirmations FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE user_id = auth.uid()
    )
  );

-- Parents can insert/update their own confirmations
CREATE POLICY "Parents can manage their own confirmations"
  ON entry_confirmations FOR ALL
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE user_id = auth.uid()
    )
  );

-- Coaches can view all confirmations
CREATE POLICY "Coaches can view all confirmations"
  ON entry_confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('coach', 'admin')
    )
  );

-- Coaches can update confirmation status
CREATE POLICY "Coaches can update confirmations"
  ON entry_confirmations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('coach', 'admin')
    )
  );

-- ============================================
-- PART 5: CREATE/UPDATE TRIGGER FOR TIMESTAMPS
-- ============================================
-- Drop and recreate trigger function
DROP FUNCTION IF EXISTS update_entry_confirmations_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_entry_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS entry_confirmations_updated_at ON entry_confirmations;

CREATE TRIGGER entry_confirmations_updated_at
  BEFORE UPDATE ON entry_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_confirmations_updated_at();

-- ============================================
-- PART 6: CREATE/UPDATE DATABASE FUNCTIONS
-- ============================================
-- Drop functions if they exist
DROP FUNCTION IF EXISTS get_parent_pending_actions(UUID);
DROP FUNCTION IF EXISTS get_meet_confirmation_stats(UUID);

-- GET PARENT PENDING ACTIONS
CREATE OR REPLACE FUNCTION get_parent_pending_actions(parent_user_uuid UUID)
RETURNS TABLE (
  meet_id UUID,
  swimmer_id BIGINT,
  meet_name VARCHAR(200),
  swimmer_name VARCHAR(100),
  entry_deadline TIMESTAMP WITH TIME ZONE,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    m.id AS meet_id,
    s.id AS swimmer_id,
    m.name AS meet_name,
    s.name AS swimmer_name,
    m.entry_deadline,
    COUNT(me.id) AS event_count
  FROM meets m
  INNER JOIN meet_entries me ON me.meet_id = m.id
  INNER JOIN swimmers s ON s.id = me.swimmer_id
  INNER JOIN parents p ON p.id = s.parent_id
  LEFT JOIN entry_confirmations ec ON 
    ec.meet_id = m.id 
    AND ec.swimmer_id = s.id 
    AND ec.parent_id = p.id
  WHERE 
    p.user_id = parent_user_uuid
    AND m.status = 'open'  -- Only open meets
    AND (ec.id IS NULL OR ec.status = 'pending')  -- No confirmation or pending
  GROUP BY m.id, s.id, m.name, s.name, m.entry_deadline
  ORDER BY m.entry_deadline ASC NULLS LAST, m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_parent_pending_actions(UUID) TO authenticated;

-- GET MEET CONFIRMATION STATS
CREATE OR REPLACE FUNCTION get_meet_confirmation_stats(meet_uuid UUID)
RETURNS TABLE (
  total_swimmers BIGINT,
  confirmed_count BIGINT,
  change_requested_count BIGINT,
  pending_count BIGINT,
  declined_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT me.swimmer_id) AS total_swimmers,
    COUNT(DISTINCT CASE WHEN ec.status = 'confirmed' THEN ec.swimmer_id END) AS confirmed_count,
    COUNT(DISTINCT CASE WHEN ec.status = 'change_requested' THEN ec.swimmer_id END) AS change_requested_count,
    COUNT(DISTINCT CASE WHEN ec.status = 'pending' OR ec.id IS NULL THEN me.swimmer_id END) AS pending_count,
    COUNT(DISTINCT CASE WHEN ec.status = 'declined' THEN ec.swimmer_id END) AS declined_count
  FROM meet_entries me
  LEFT JOIN entry_confirmations ec ON 
    ec.meet_id = me.meet_id 
    AND ec.swimmer_id = me.swimmer_id
  WHERE me.meet_id = meet_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_meet_confirmation_stats(UUID) TO authenticated;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Your existing data is safe and the missing pieces have been added.
-- Test the confirmation feature now!
-- ============================================

