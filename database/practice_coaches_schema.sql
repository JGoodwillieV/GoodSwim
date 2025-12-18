-- Practice Coaches Junction Table
-- Allows multiple coaches to be assigned to individual practices
-- Simpler than group assignments for ad-hoc coach scheduling

CREATE TABLE IF NOT EXISTS practice_coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- The practice
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  
  -- The coach/staff member
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  
  -- Role for this specific practice
  is_lead BOOLEAN DEFAULT false,
  
  -- Metadata
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE (practice_id, staff_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_practice_coaches_practice ON practice_coaches(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_coaches_staff ON practice_coaches(staff_id);

-- Row Level Security
ALTER TABLE practice_coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view practice coach assignments"
  ON practice_coaches FOR SELECT
  USING (true);  -- Anyone can see assignments

CREATE POLICY "Coaches can manage practice coach assignments"
  ON practice_coaches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM practices 
      WHERE practices.id = practice_coaches.practice_id 
      AND (practices.coach_id = auth.uid() OR practices.created_by = auth.uid())
    )
  );

