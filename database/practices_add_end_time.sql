-- Add end_time column to practices table
-- This allows tracking when practices end for better calendar display

ALTER TABLE practices 
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add index for queries that filter by time
CREATE INDEX IF NOT EXISTS idx_practices_end_time ON practices(end_time);

