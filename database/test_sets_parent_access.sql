-- RLS Policies for Test Sets - Parent Access
-- This allows parents to view test set results for their swimmers

-- ============================================
-- Enable RLS on tables (if not already enabled)
-- ============================================
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_set_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Coaches can manage their own test sets" ON test_sets;
DROP POLICY IF EXISTS "Parents can view test sets for their swimmers" ON test_sets;
DROP POLICY IF EXISTS "Coaches can manage test set results" ON test_set_results;
DROP POLICY IF EXISTS "Parents can view test set results for their swimmers" ON test_set_results;

-- ============================================
-- TEST_SETS TABLE POLICIES
-- ============================================

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

-- ============================================
-- TEST_SET_RESULTS TABLE POLICIES
-- ============================================

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
-- INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_test_set_results_swimmer ON test_set_results(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_test_set_results_test_set ON test_set_results(test_set_id);
CREATE INDEX IF NOT EXISTS idx_test_sets_coach ON test_sets(coach_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- To verify policies are working, run these as a parent user:
-- SELECT * FROM test_set_results WHERE swimmer_id = '<your_swimmer_id>';
-- SELECT * FROM test_sets WHERE id IN (SELECT test_set_id FROM test_set_results WHERE swimmer_id = '<your_swimmer_id>');

