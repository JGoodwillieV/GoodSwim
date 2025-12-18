-- Team Records Table
-- Stores Hurricane Swim Club's team records for all age groups and events

CREATE TABLE IF NOT EXISTS team_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event VARCHAR(100) NOT NULL,           -- e.g., "25 Free", "50 Free", "100 Back"
  age_group VARCHAR(20) NOT NULL,        -- e.g., "8 & Under", "9/10", "11/12", "13/14", "15 & Over"
  gender VARCHAR(10) NOT NULL,           -- "Male" or "Female"
  swimmer_name VARCHAR(100) NOT NULL,    -- Name of record holder
  time_seconds DECIMAL(10, 2) NOT NULL,  -- Time in seconds
  time_display VARCHAR(20) NOT NULL,     -- Formatted time string (e.g., "16.01", "1:18.18")
  date DATE NOT NULL,                    -- Date record was set
  course VARCHAR(10) DEFAULT 'SCY',      -- SCY (Short Course Yards), SCM, or LCM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_records_event ON team_records(event);
CREATE INDEX IF NOT EXISTS idx_team_records_age_group ON team_records(age_group);
CREATE INDEX IF NOT EXISTS idx_team_records_gender ON team_records(gender);
CREATE INDEX IF NOT EXISTS idx_team_records_lookup ON team_records(event, age_group, gender, course);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE team_records ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read team records
CREATE POLICY "Team records are viewable by everyone" 
  ON team_records FOR SELECT 
  USING (true);

-- Only authenticated users can insert/update/delete (for coaches/admins)
CREATE POLICY "Only authenticated users can modify team records" 
  ON team_records FOR ALL 
  USING (auth.role() = 'authenticated');

