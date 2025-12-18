-- Fix RLS Policies for Test Sets (For Existing Tables)
-- This fixes the 500 errors by allowing proper access for parents and coaches

-- ============================================
-- STEP 1: Enable RLS (if not already enabled)
-- ============================================
ALTER TABLE test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_set_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL existing policies
-- ============================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on test_sets
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'test_sets') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON test_sets';
    END LOOP;
    
    -- Drop all policies on test_set_results
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'test_set_results') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON test_set_results';
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Create new policies for TEST_SETS
-- ============================================

-- Coaches can do everything with their own test sets
CREATE POLICY "coaches_all_own_test_sets"
  ON test_sets
  FOR ALL
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Parents can SELECT test sets that have results for their swimmers
CREATE POLICY "parents_view_test_sets"
  ON test_sets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM test_set_results tsr
      JOIN swimmer_parents sp ON sp.swimmer_id = tsr.swimmer_id
      JOIN parents p ON p.id = sp.parent_id
      WHERE tsr.test_set_id = test_sets.id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 4: Create new policies for TEST_SET_RESULTS
-- ============================================

-- Coaches can do everything with results for their swimmers
CREATE POLICY "coaches_all_test_set_results"
  ON test_set_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM swimmers
      WHERE swimmers.id = test_set_results.swimmer_id
      AND swimmers.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM swimmers
      WHERE swimmers.id = test_set_results.swimmer_id
      AND swimmers.coach_id = auth.uid()
    )
  );

-- Parents can SELECT results for their swimmers
CREATE POLICY "parents_view_test_set_results"
  ON test_set_results
  FOR SELECT
  TO authenticated
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
-- STEP 5: Verify foreign key constraints exist
-- ============================================

-- Check if foreign key from test_set_results to swimmers exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'test_set_results_swimmer_id_fkey'
    ) THEN
        -- Add foreign key if missing
        ALTER TABLE test_set_results 
        ADD CONSTRAINT test_set_results_swimmer_id_fkey 
        FOREIGN KEY (swimmer_id) REFERENCES swimmers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- STEP 6: Add helpful indexes if missing
-- ============================================
CREATE INDEX IF NOT EXISTS idx_test_sets_coach ON test_sets(coach_id);
CREATE INDEX IF NOT EXISTS idx_test_set_results_test_set ON test_set_results(test_set_id);
CREATE INDEX IF NOT EXISTS idx_test_set_results_swimmer ON test_set_results(swimmer_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify policies are working:

-- As a coach, check you can see your test sets:
-- SELECT COUNT(*) FROM test_sets;

-- As a coach, check you can see results:
-- SELECT COUNT(*) FROM test_set_results;

-- Check that policies exist:
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('test_sets', 'test_set_results')
-- ORDER BY tablename, policyname;

