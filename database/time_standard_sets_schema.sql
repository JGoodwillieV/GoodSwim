-- Time Standard Sets Schema
-- Supports team-scoped, shareable collections of time standards (meet cuts, state standards, etc.)

-- 1. time_standard_sets: named collections of cut times
CREATE TABLE IF NOT EXISTS time_standard_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  organization VARCHAR(200),
  season VARCHAR(50),
  course VARCHAR(10),
  created_by_team_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT true,
  source_file_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tss_team ON time_standard_sets(created_by_team_id);
CREATE INDEX IF NOT EXISTS idx_tss_public ON time_standard_sets(is_public, status);

ALTER TABLE time_standard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time standard sets are viewable by everyone"
  ON time_standard_sets FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert time standard sets"
  ON time_standard_sets FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Creators can update their own sets"
  ON time_standard_sets FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Creators can delete their own sets"
  ON time_standard_sets FOR DELETE
  USING (auth.role() = 'authenticated');


-- 2. time_standard_entries: individual cut times within a set
CREATE TABLE IF NOT EXISTS time_standard_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES time_standard_sets(id) ON DELETE CASCADE,
  standard_name VARCHAR(50) NOT NULL,
  event VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  course VARCHAR(10) NOT NULL,
  time_seconds DECIMAL(10, 2) NOT NULL,
  time_string VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tse_set ON time_standard_entries(set_id);
CREATE INDEX IF NOT EXISTS idx_tse_lookup ON time_standard_entries(set_id, event, gender, course);
CREATE INDEX IF NOT EXISTS idx_tse_age ON time_standard_entries(set_id, age_min, age_max);

ALTER TABLE time_standard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time standard entries are viewable by everyone"
  ON time_standard_entries FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert time standard entries"
  ON time_standard_entries FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update time standard entries"
  ON time_standard_entries FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete time standard entries"
  ON time_standard_entries FOR DELETE
  USING (auth.role() = 'authenticated');


-- 3. team_standard_selections: which sets a team has activated
CREATE TABLE IF NOT EXISTS team_standard_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  set_id UUID NOT NULL REFERENCES time_standard_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, set_id)
);

CREATE INDEX IF NOT EXISTS idx_tssel_team ON team_standard_selections(team_id);
CREATE INDEX IF NOT EXISTS idx_tssel_set ON team_standard_selections(set_id);

ALTER TABLE team_standard_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team standard selections are viewable by everyone"
  ON team_standard_selections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert team standard selections"
  ON team_standard_selections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete team standard selections"
  ON team_standard_selections FOR DELETE
  USING (auth.role() = 'authenticated');
