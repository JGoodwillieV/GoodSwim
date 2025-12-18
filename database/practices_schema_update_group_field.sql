-- Migration: Update training_group_id to support text group names
-- This fixes the issue where group selector doesn't work
-- Run this ONLY if you've already run practices_schema.sql

-- Change training_group_id from BIGINT to VARCHAR to store group names
ALTER TABLE practices 
ALTER COLUMN training_group_id TYPE VARCHAR(100) 
USING training_group_id::VARCHAR;

-- No data migration needed since most practices probably have NULL values
-- If you have practices with numeric training_group_id values, they'll be converted to text

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'practices' 
AND column_name = 'training_group_id';

-- Expected result: training_group_id | character varying

