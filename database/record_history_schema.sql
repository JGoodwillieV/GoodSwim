-- Record History Table
-- Tracks every time a team record is broken, creating a historical log

CREATE TABLE IF NOT EXISTS record_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  age_group VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  swimmer_id BIGINT REFERENCES swimmers(id),
  swimmer_name VARCHAR(100) NOT NULL,
  time_seconds DECIMAL(10, 2) NOT NULL,
  time_display VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  course VARCHAR(10) DEFAULT 'SCY',
  
  -- Previous record information
  previous_record_holder VARCHAR(100),
  previous_time_seconds DECIMAL(10, 2),
  previous_time_display VARCHAR(20),
  improvement_seconds DECIMAL(10, 2),
  
  -- When this record was set
  broken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional: When this record was broken by someone else
  held_until TIMESTAMP WITH TIME ZONE,
  superseded_by UUID REFERENCES record_history(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_record_history_event ON record_history(event);
CREATE INDEX IF NOT EXISTS idx_record_history_age_group ON record_history(age_group);
CREATE INDEX IF NOT EXISTS idx_record_history_gender ON record_history(gender);
CREATE INDEX IF NOT EXISTS idx_record_history_date ON record_history(date);
CREATE INDEX IF NOT EXISTS idx_record_history_swimmer ON record_history(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_record_history_lookup ON record_history(event, age_group, gender, course);
CREATE INDEX IF NOT EXISTS idx_record_history_chronological ON record_history(event, age_group, gender, broken_at);

-- RLS Policies
ALTER TABLE record_history ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read record history
CREATE POLICY "Record history is viewable by everyone" 
  ON record_history FOR SELECT 
  USING (true);

-- Only authenticated users can insert/update
CREATE POLICY "Only authenticated users can modify record history" 
  ON record_history FOR ALL 
  USING (auth.role() = 'authenticated');

-- Create a view for easy querying of record progressions
CREATE OR REPLACE VIEW record_progression AS
SELECT 
  event,
  age_group,
  gender,
  course,
  swimmer_name,
  time_seconds,
  time_display,
  date,
  previous_record_holder,
  previous_time_seconds,
  improvement_seconds,
  broken_at,
  held_until,
  CASE 
    WHEN held_until IS NULL THEN 'Current Record'
    ELSE 'Historical'
  END as status,
  EXTRACT(EPOCH FROM (COALESCE(held_until, NOW()) - broken_at)) / 86400 as days_held
FROM record_history
ORDER BY event, age_group, gender, broken_at DESC;

-- Comments for documentation
COMMENT ON TABLE record_history IS 'Historical log of all team record breaks';
COMMENT ON COLUMN record_history.broken_at IS 'When the swimmer broke the record (timestamp of update)';
COMMENT ON COLUMN record_history.held_until IS 'When this record was broken by someone else (null if current)';
COMMENT ON COLUMN record_history.superseded_by IS 'ID of the record that broke this one';

