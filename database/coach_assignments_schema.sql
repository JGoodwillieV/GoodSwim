-- Coach Group Assignments Schema
-- Layer 3: Allows head coaches to assign staff to practice groups

-- ============================================
-- COACH ASSIGNMENTS TABLE
-- ============================================
-- Links coaches to practice groups they're responsible for
-- Supports both permanent assignments and day-specific ones

CREATE TABLE IF NOT EXISTS coach_group_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- The coach being assigned
  coach_id UUID NOT NULL,  -- References auth.users(id)
  coach_name VARCHAR(100), -- Cached name for display
  
  -- What they're assigned to
  group_name VARCHAR(100) NOT NULL,  -- e.g., "CAT 2 Early"
  activity_type VARCHAR(50),  -- NULL = all activities, or specific like 'swim', 'dryland'
  
  -- When assignment applies
  day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    -- NULL = all days, 0 = Sunday, 6 = Saturday
  
  -- Date range (for temporary/seasonal assignments)
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,  -- NULL = ongoing
  
  -- Role
  is_lead BOOLEAN DEFAULT false,  -- Primary coach vs assistant for this group
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_by UUID,  -- Head coach who made assignment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE (coach_id, group_name, activity_type, day_of_week, effective_date)
);

-- ============================================
-- STAFF/COACHES TABLE
-- ============================================
-- Stores coach/staff info for display and assignment
-- Could be separate from auth.users for flexibility

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,  -- Optional link to auth.users if they have a login
  
  -- Display info
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Role/position
  role VARCHAR(50) DEFAULT 'assistant' CHECK (role IN ('head_coach', 'age_group_coach', 'assistant', 'volunteer', 'admin')),
  
  -- Availability (optional)
  available_days INTEGER[] DEFAULT '{1,2,3,4,5}',  -- Default Mon-Fri
  
  -- Active status
  is_active BOOLEAN DEFAULT true,
  
  -- Display
  avatar_color VARCHAR(20) DEFAULT 'blue',  -- For avatar placeholder
  initials VARCHAR(3),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Coach assignments
CREATE INDEX IF NOT EXISTS idx_coach_assignments_coach ON coach_group_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_group ON coach_group_assignments(group_name);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_effective ON coach_group_assignments(effective_date, end_date);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_day ON coach_group_assignments(day_of_week);

-- Staff members
CREATE INDEX IF NOT EXISTS idx_staff_members_user ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_members_role ON staff_members(role);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE coach_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Coach assignments - all authenticated users can read, only admins/head coaches can modify
CREATE POLICY "Anyone can view coach assignments"
  ON coach_group_assignments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage coach assignments"
  ON coach_group_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Staff members - all authenticated users can read
CREATE POLICY "Anyone can view staff members"
  ON staff_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage staff members"
  ON staff_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get coaches assigned to a specific group/day
CREATE OR REPLACE FUNCTION get_assigned_coaches(
  p_group_name VARCHAR,
  p_day_of_week INTEGER DEFAULT NULL,
  p_activity_type VARCHAR DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  coach_id UUID,
  coach_name VARCHAR,
  is_lead BOOLEAN,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cga.coach_id,
    COALESCE(cga.coach_name, sm.name) as coach_name,
    cga.is_lead,
    cga.notes
  FROM coach_group_assignments cga
  LEFT JOIN staff_members sm ON sm.user_id = cga.coach_id
  WHERE cga.group_name = p_group_name
    AND (cga.day_of_week IS NULL OR cga.day_of_week = p_day_of_week)
    AND (cga.activity_type IS NULL OR cga.activity_type = p_activity_type)
    AND cga.effective_date <= p_date
    AND (cga.end_date IS NULL OR cga.end_date >= p_date)
  ORDER BY cga.is_lead DESC, cga.coach_name;
END;
$$ LANGUAGE plpgsql;

-- Get all groups a coach is assigned to
CREATE OR REPLACE FUNCTION get_coach_assignments(
  p_coach_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  group_name VARCHAR,
  activity_type VARCHAR,
  day_of_week INTEGER,
  is_lead BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cga.group_name,
    cga.activity_type,
    cga.day_of_week,
    cga.is_lead
  FROM coach_group_assignments cga
  WHERE cga.coach_id = p_coach_id
    AND cga.effective_date <= p_date
    AND (cga.end_date IS NULL OR cga.end_date >= p_date)
  ORDER BY cga.group_name, cga.day_of_week;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA (Example staff members)
-- ============================================
-- Uncomment to add sample staff

-- INSERT INTO staff_members (name, role, initials, avatar_color) VALUES
--   ('Joe', 'head_coach', 'J', 'blue'),
--   ('Jack', 'assistant', 'JK', 'emerald'),
--   ('Harrison', 'assistant', 'H', 'purple'),
--   ('Nikki', 'assistant', 'N', 'rose'),
--   ('Max', 'volunteer', 'M', 'amber')
-- ON CONFLICT DO NOTHING;

