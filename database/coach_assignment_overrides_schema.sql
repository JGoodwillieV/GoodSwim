-- Coach Assignment Overrides Schema
-- Per-date overrides for recurring coach-to-group assignments
-- Follows the same "template + exception" pattern as practice_schedule_exceptions

-- ============================================
-- COACH ASSIGNMENT OVERRIDES TABLE
-- ============================================
-- When a coach is sick, on vacation, or needs a substitute for a specific date,
-- this table stores the override. The recurring assignment in coach_group_assignments
-- remains the "default", and this table stores exceptions to it.

CREATE TABLE IF NOT EXISTS coach_assignment_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- What date is being overridden
  override_date DATE NOT NULL,
  
  -- Which group/activity
  group_name VARCHAR(100) NOT NULL,
  activity_type VARCHAR(50),  -- NULL = all activities for this group
  
  -- The coach being affected (from the recurring assignment)
  original_coach_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  
  -- The replacement coach (if substituting)
  replacement_coach_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Type of override
  override_type VARCHAR(20) NOT NULL CHECK (override_type IN (
    'absent',       -- Coach is absent, no replacement
    'substitute',   -- Coach is replaced by another coach
    'added',        -- Extra coach added for this date only
    'removed'       -- Coach specifically removed from this date
  )),
  
  -- Reason for the override
  reason VARCHAR(200),
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_coach_overrides_date ON coach_assignment_overrides(override_date);
CREATE INDEX IF NOT EXISTS idx_coach_overrides_group ON coach_assignment_overrides(group_name);
CREATE INDEX IF NOT EXISTS idx_coach_overrides_date_group ON coach_assignment_overrides(override_date, group_name);
CREATE INDEX IF NOT EXISTS idx_coach_overrides_original ON coach_assignment_overrides(original_coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_overrides_replacement ON coach_assignment_overrides(replacement_coach_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE coach_assignment_overrides ENABLE ROW LEVEL SECURITY;

-- Everyone can view overrides
CREATE POLICY "Anyone can view coach assignment overrides"
  ON coach_assignment_overrides FOR SELECT
  USING (true);

-- Authenticated users can manage overrides
CREATE POLICY "Authenticated users can manage coach assignment overrides"
  ON coach_assignment_overrides FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTION: Get effective coaches for a group on a specific date
-- ============================================
-- Returns the effective list of coaches for a group on a given date,
-- accounting for recurring assignments AND per-date overrides.

CREATE OR REPLACE FUNCTION get_effective_coaches_for_date(
  p_group_name VARCHAR,
  p_date DATE,
  p_activity_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  coach_name VARCHAR,
  is_lead BOOLEAN,
  is_override BOOLEAN,
  override_reason VARCHAR
) AS $$
DECLARE
  p_day_of_week INTEGER;
BEGIN
  p_day_of_week := EXTRACT(DOW FROM p_date);
  
  RETURN QUERY
  
  -- Start with recurring assignments for this group/day
  WITH recurring AS (
    SELECT 
      cga.coach_id AS staff_id,
      COALESCE(sm.name, cga.coach_name) AS coach_name,
      cga.is_lead,
      FALSE AS is_override,
      NULL::VARCHAR AS override_reason
    FROM coach_group_assignments cga
    LEFT JOIN staff_members sm ON sm.id = cga.coach_id
    WHERE cga.group_name = p_group_name
      AND (cga.day_of_week IS NULL OR cga.day_of_week = p_day_of_week)
      AND (cga.activity_type IS NULL OR cga.activity_type = p_activity_type)
      AND cga.effective_date <= p_date
      AND (cga.end_date IS NULL OR cga.end_date >= p_date)
  ),
  -- Get overrides for this date
  overrides AS (
    SELECT 
      cao.original_coach_id,
      cao.replacement_coach_id,
      cao.override_type,
      cao.reason
    FROM coach_assignment_overrides cao
    WHERE cao.override_date = p_date
      AND cao.group_name = p_group_name
      AND (cao.activity_type IS NULL OR cao.activity_type = p_activity_type)
  )
  -- Recurring coaches NOT overridden (absent/removed/substituted)
  SELECT 
    r.staff_id,
    r.coach_name,
    r.is_lead,
    r.is_override,
    r.override_reason
  FROM recurring r
  WHERE NOT EXISTS (
    SELECT 1 FROM overrides o 
    WHERE o.original_coach_id = r.staff_id 
      AND o.override_type IN ('absent', 'substitute', 'removed')
  )
  
  UNION ALL
  
  -- Substitute coaches (replacements)
  SELECT 
    o.replacement_coach_id AS staff_id,
    sm.name AS coach_name,
    FALSE AS is_lead,
    TRUE AS is_override,
    o.reason AS override_reason
  FROM overrides o
  JOIN staff_members sm ON sm.id = o.replacement_coach_id
  WHERE o.override_type = 'substitute'
    AND o.replacement_coach_id IS NOT NULL
  
  UNION ALL
  
  -- Added coaches (extra for this date only)
  SELECT 
    o.replacement_coach_id AS staff_id,
    sm.name AS coach_name,
    FALSE AS is_lead,
    TRUE AS is_override,
    o.reason AS override_reason
  FROM overrides o
  JOIN staff_members sm ON sm.id = o.replacement_coach_id
  WHERE o.override_type = 'added'
    AND o.replacement_coach_id IS NOT NULL;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
