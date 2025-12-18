-- Practice Schedules Schema
-- Stores recurring weekly practice schedules for each training group
-- Supports swim and dryland sessions with different times per day

-- ============================================
-- PRACTICE SCHEDULES TABLE (Weekly Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS practice_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Group Information
  group_name VARCHAR(100) NOT NULL,  -- e.g., "CAT 1 Early", "Tropical Storms", "CAT 5 Orange & Silver"
  
  -- Schedule Details
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday, 1=Monday, etc.
  activity_type VARCHAR(20) NOT NULL DEFAULT 'swim' CHECK (activity_type IN ('swim', 'dryland', 'doubles_am', 'doubles_pm')),
  
  -- Times
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Season Dates (when this schedule is active)
  season_start_date DATE NOT NULL,
  season_end_date DATE NOT NULL,
  
  -- Location (optional)
  location_name VARCHAR(200),
  
  -- Notes (e.g., "Dryland built into practice")
  notes TEXT,
  
  -- Display Order (for sorting groups in UI)
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRACTICE SCHEDULE EXCEPTIONS TABLE
-- ============================================
-- Stores modifications to the regular schedule (holidays, changes, additions)
CREATE TABLE IF NOT EXISTS practice_schedule_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- What's being modified
  exception_date DATE NOT NULL,
  group_name VARCHAR(100),  -- NULL means all groups
  activity_type VARCHAR(20),  -- NULL means all activities for that group/day
  
  -- Type of exception
  exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('canceled', 'modified', 'added')),
  
  -- If modified or added, what are the new times?
  new_start_time TIME,
  new_end_time TIME,
  new_location VARCHAR(200),
  
  -- Reason for the exception
  reason VARCHAR(200),  -- e.g., "Winter Break", "Meet Weekend", "Pool Maintenance"
  
  -- For recurring exceptions (e.g., no practice every Sunday)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_end_date DATE,  -- If recurring, when does it stop?
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRACTICE SCHEDULE GROUPS TABLE (Optional)
-- ============================================
-- Defines the training groups and their display properties
CREATE TABLE IF NOT EXISTS practice_schedule_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  group_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100),  -- Friendly name if different from group_name
  color VARCHAR(20) DEFAULT 'blue',  -- For UI display
  display_order INTEGER DEFAULT 0,
  
  -- Group metadata
  description TEXT,
  min_age INTEGER,
  max_age INTEGER,
  
  -- Is this group currently active?
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Practice Schedules
CREATE INDEX IF NOT EXISTS idx_practice_schedules_group ON practice_schedules(group_name);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_day ON practice_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_season ON practice_schedules(season_start_date, season_end_date);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_group_day ON practice_schedules(group_name, day_of_week);

-- Exceptions
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON practice_schedule_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_group ON practice_schedule_exceptions(group_name);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date_group ON practice_schedule_exceptions(exception_date, group_name);

-- Groups
CREATE INDEX IF NOT EXISTS idx_schedule_groups_order ON practice_schedule_groups(display_order);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Practice Schedules
ALTER TABLE practice_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone can view schedules (parents need to see their group's schedule)
CREATE POLICY "Everyone can view practice schedules"
  ON practice_schedules FOR SELECT
  USING (true);

-- Only coaches can create/update/delete schedules
CREATE POLICY "Only coaches can insert practice schedules"
  ON practice_schedules FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

CREATE POLICY "Only coaches can update practice schedules"
  ON practice_schedules FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

CREATE POLICY "Only coaches can delete practice schedules"
  ON practice_schedules FOR DELETE
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

-- Practice Schedule Exceptions
ALTER TABLE practice_schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view schedule exceptions"
  ON practice_schedule_exceptions FOR SELECT
  USING (true);

CREATE POLICY "Only coaches can insert schedule exceptions"
  ON practice_schedule_exceptions FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

CREATE POLICY "Only coaches can update schedule exceptions"
  ON practice_schedule_exceptions FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

CREATE POLICY "Only coaches can delete schedule exceptions"
  ON practice_schedule_exceptions FOR DELETE
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

-- Practice Schedule Groups
ALTER TABLE practice_schedule_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view schedule groups"
  ON practice_schedule_groups FOR SELECT
  USING (true);

CREATE POLICY "Only coaches can manage schedule groups"
  ON practice_schedule_groups FOR ALL
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

-- ============================================
-- HELPER FUNCTION: Get Schedule for Date
-- ============================================
-- Returns the effective schedule for a specific date, accounting for exceptions

CREATE OR REPLACE FUNCTION get_practice_schedule_for_date(
  target_date DATE,
  target_group VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
  group_name VARCHAR(100),
  activity_type VARCHAR(20),
  start_time TIME,
  end_time TIME,
  location_name VARCHAR(200),
  notes TEXT,
  is_canceled BOOLEAN,
  is_modified BOOLEAN,
  exception_reason VARCHAR(200)
) AS $$
DECLARE
  day_num INTEGER;
BEGIN
  day_num := EXTRACT(DOW FROM target_date);
  
  RETURN QUERY
  WITH base_schedule AS (
    -- Get the regular schedule for this day
    SELECT 
      ps.group_name,
      ps.activity_type,
      ps.start_time,
      ps.end_time,
      ps.location_name,
      ps.notes
    FROM practice_schedules ps
    WHERE ps.day_of_week = day_num
      AND target_date BETWEEN ps.season_start_date AND ps.season_end_date
      AND (target_group IS NULL OR ps.group_name = target_group)
  ),
  exceptions AS (
    -- Get any exceptions for this date
    SELECT 
      pse.group_name AS exc_group,
      pse.activity_type AS exc_activity,
      pse.exception_type,
      pse.new_start_time,
      pse.new_end_time,
      pse.new_location,
      pse.reason
    FROM practice_schedule_exceptions pse
    WHERE pse.exception_date = target_date
      AND (pse.group_name IS NULL OR target_group IS NULL OR pse.group_name = target_group)
  )
  SELECT 
    bs.group_name,
    bs.activity_type,
    COALESCE(e.new_start_time, bs.start_time) AS start_time,
    COALESCE(e.new_end_time, bs.end_time) AS end_time,
    COALESCE(e.new_location, bs.location_name) AS location_name,
    bs.notes,
    COALESCE(e.exception_type = 'canceled', FALSE) AS is_canceled,
    COALESCE(e.exception_type = 'modified', FALSE) AS is_modified,
    e.reason AS exception_reason
  FROM base_schedule bs
  LEFT JOIN exceptions e ON 
    (e.exc_group IS NULL OR e.exc_group = bs.group_name)
    AND (e.exc_activity IS NULL OR e.exc_activity = bs.activity_type)
  
  UNION ALL
  
  -- Add any "added" exceptions (practices that don't exist in regular schedule)
  SELECT 
    pse.group_name,
    COALESCE(pse.activity_type, 'swim') AS activity_type,
    pse.new_start_time AS start_time,
    pse.new_end_time AS end_time,
    pse.new_location AS location_name,
    NULL AS notes,
    FALSE AS is_canceled,
    FALSE AS is_modified,
    pse.reason AS exception_reason
  FROM practice_schedule_exceptions pse
  WHERE pse.exception_date = target_date
    AND pse.exception_type = 'added'
    AND pse.new_start_time IS NOT NULL
    AND (target_group IS NULL OR pse.group_name = target_group)
  
  ORDER BY group_name, start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get Week Schedule
-- ============================================
CREATE OR REPLACE FUNCTION get_practice_schedule_for_week(
  week_start DATE,
  target_group VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
  schedule_date DATE,
  day_of_week INTEGER,
  group_name VARCHAR(100),
  activity_type VARCHAR(20),
  start_time TIME,
  end_time TIME,
  location_name VARCHAR(200),
  notes TEXT,
  is_canceled BOOLEAN,
  is_modified BOOLEAN,
  exception_reason VARCHAR(200)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d::DATE AS schedule_date,
    EXTRACT(DOW FROM d)::INTEGER AS day_of_week,
    gs.*
  FROM generate_series(week_start, week_start + INTERVAL '6 days', INTERVAL '1 day') AS d
  CROSS JOIN LATERAL get_practice_schedule_for_date(d::DATE, target_group) AS gs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

