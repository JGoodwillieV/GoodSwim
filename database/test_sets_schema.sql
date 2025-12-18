-- Test Sets Feature - Complete Database Schema
-- This creates the tables needed for the Test Set Tracker feature

-- ============================================
-- TEST_SETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS test_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Set Configuration
  name VARCHAR(100) NOT NULL,
  group_name VARCHAR(100),
  reps INTEGER NOT NULL,
  distance INTEGER NOT NULL,
  stroke VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL, -- e.g., "Test Set", "Pace Set"
  
  -- Interval Configuration
  interval_seconds INTEGER,
  
  -- Lane Configuration (for staggered starts)
  use_lanes BOOLEAN DEFAULT false,
  lane_stagger_seconds INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEST_SET_RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS test_set_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_set_id UUID REFERENCES test_sets(id) ON DELETE CASCADE,
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  
  -- Result Data
  rep_number INTEGER NOT NULL,
  time_ms INTEGER NOT NULL, -- Time in milliseconds
  
  -- Lane Information (for staggered starts)
  lane_number INTEGER,
  lane_position INTEGER,
  start_offset_ms INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique rep per swimmer per test set
  UNIQUE(test_set_id, swimmer_id, rep_number)
);

-- ============================================
-- INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_test_sets_coach ON test_sets(coach_id);
CREATE INDEX IF NOT EXISTS idx_test_sets_created ON test_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_sets_group ON test_sets(group_name);

CREATE INDEX IF NOT EXISTS idx_test_set_results_test_set ON test_set_results(test_set_id);
CREATE INDEX IF NOT EXISTS idx_test_set_results_swimmer ON test_set_results(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_test_set_results_created ON test_set_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_set_results_lane ON test_set_results(test_set_id, lane_number);
CREATE INDEX IF NOT EXISTS idx_test_set_results_position ON test_set_results(test_set_id, lane_number, lane_position);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_set_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Coaches can manage their own test sets" ON test_sets;
DROP POLICY IF EXISTS "Parents can view test sets for their swimmers" ON test_sets;
DROP POLICY IF EXISTS "Coaches can manage test set results" ON test_set_results;
DROP POLICY IF EXISTS "Parents can view test set results for their swimmers" ON test_set_results;

-- TEST_SETS POLICIES

-- Policy 1: Coaches can manage their own test sets
CREATE POLICY "Coaches can manage their own test sets"
  ON test_sets FOR ALL
  USING (auth.uid() = coach_id);

-- Policy 2: Parents can view test sets that have results for their swimmers
CREATE POLICY "Parents can view test sets for their swimmers"
  ON test_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM test_set_results tsr
      JOIN swimmers s ON s.id = tsr.swimmer_id
      JOIN swimmer_parents sp ON sp.swimmer_id = s.id
      JOIN parents p ON p.id = sp.parent_id
      WHERE tsr.test_set_id = test_sets.id
      AND p.user_id = auth.uid()
    )
  );

-- TEST_SET_RESULTS POLICIES

-- Policy 1: Coaches can manage results for their swimmers
CREATE POLICY "Coaches can manage test set results"
  ON test_set_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM swimmers
      WHERE swimmers.id = test_set_results.swimmer_id
      AND swimmers.coach_id = auth.uid()
    )
  );

-- Policy 2: Parents can view results for their swimmers
CREATE POLICY "Parents can view test set results for their swimmers"
  ON test_set_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM swimmer_parents sp
      JOIN parents p ON p.id = sp.parent_id
      WHERE sp.swimmer_id = test_set_results.swimmer_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- COMMENTS (for documentation)
-- ============================================
COMMENT ON TABLE test_sets IS 'Stores test set configurations created by coaches';
COMMENT ON TABLE test_set_results IS 'Stores individual results for each swimmer in a test set';

COMMENT ON COLUMN test_sets.use_lanes IS 'Whether this test set uses lane-based organization with staggered starts';
COMMENT ON COLUMN test_sets.lane_stagger_seconds IS 'Number of seconds between swimmer starts in the same lane';
COMMENT ON COLUMN test_set_results.lane_number IS 'The lane number the swimmer was in for this result';
COMMENT ON COLUMN test_set_results.lane_position IS 'Position within the lane (0 = first, 1 = second, etc.)';
COMMENT ON COLUMN test_set_results.start_offset_ms IS 'Milliseconds offset from rep start time (calculated as lane_position * lane_stagger_seconds * 1000)';

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the setup:
-- SELECT * FROM test_sets LIMIT 1;
-- SELECT * FROM test_set_results LIMIT 1;

