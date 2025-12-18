-- Migration: Add Lane Support to Test Sets
-- This adds support for lane-based test sets with staggered starts

-- Add lane configuration columns to test_sets table
ALTER TABLE test_sets 
ADD COLUMN IF NOT EXISTS use_lanes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lane_stagger_seconds INTEGER;

-- Add lane tracking columns to test_set_results table
ALTER TABLE test_set_results
ADD COLUMN IF NOT EXISTS lane_number INTEGER,
ADD COLUMN IF NOT EXISTS lane_position INTEGER,
ADD COLUMN IF NOT EXISTS start_offset_ms INTEGER DEFAULT 0;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_test_set_results_lane ON test_set_results(test_set_id, lane_number);
CREATE INDEX IF NOT EXISTS idx_test_set_results_position ON test_set_results(test_set_id, lane_number, lane_position);

-- Add comments for documentation
COMMENT ON COLUMN test_sets.use_lanes IS 'Whether this test set uses lane-based organization with staggered starts';
COMMENT ON COLUMN test_sets.lane_stagger_seconds IS 'Number of seconds between swimmer starts in the same lane';
COMMENT ON COLUMN test_set_results.lane_number IS 'The lane number the swimmer was in for this result';
COMMENT ON COLUMN test_set_results.lane_position IS 'Position within the lane (0 = first, 1 = second, etc.)';
COMMENT ON COLUMN test_set_results.start_offset_ms IS 'Milliseconds offset from rep start time (calculated as lane_position * lane_stagger_seconds * 1000)';

