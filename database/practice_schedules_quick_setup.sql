-- Practice Schedules Quick Setup
-- Run this in your Supabase SQL Editor to create the required tables

-- ============================================
-- PRACTICE SCHEDULES TABLE (Weekly Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS practice_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  activity_type VARCHAR(20) NOT NULL DEFAULT 'swim' CHECK (activity_type IN ('swim', 'dryland', 'doubles_am', 'doubles_pm')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  season_start_date DATE NOT NULL,
  season_end_date DATE NOT NULL,
  location_name VARCHAR(200),
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID,  -- No foreign key to avoid permission issues
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRACTICE SCHEDULE EXCEPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS practice_schedule_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exception_date DATE NOT NULL,
  group_name VARCHAR(100),
  activity_type VARCHAR(20),
  exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('canceled', 'modified', 'added')),
  new_start_time TIME,
  new_end_time TIME,
  new_location VARCHAR(200),
  reason VARCHAR(200),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_end_date DATE,
  created_by UUID,  -- No foreign key to avoid permission issues
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_practice_schedules_group ON practice_schedules(group_name);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_day ON practice_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON practice_schedule_exceptions(exception_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE practice_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "Everyone can view practice schedules" ON practice_schedules;
DROP POLICY IF EXISTS "Authenticated users can insert practice schedules" ON practice_schedules;
DROP POLICY IF EXISTS "Authenticated users can update practice schedules" ON practice_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete practice schedules" ON practice_schedules;

DROP POLICY IF EXISTS "Everyone can view schedule exceptions" ON practice_schedule_exceptions;
DROP POLICY IF EXISTS "Authenticated users can insert schedule exceptions" ON practice_schedule_exceptions;
DROP POLICY IF EXISTS "Authenticated users can update schedule exceptions" ON practice_schedule_exceptions;
DROP POLICY IF EXISTS "Authenticated users can delete schedule exceptions" ON practice_schedule_exceptions;

-- Practice Schedules Policies (allow all authenticated users for now)
CREATE POLICY "Everyone can view practice schedules"
  ON practice_schedules FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert practice schedules"
  ON practice_schedules FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update practice schedules"
  ON practice_schedules FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete practice schedules"
  ON practice_schedules FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Exception Policies
CREATE POLICY "Everyone can view schedule exceptions"
  ON practice_schedule_exceptions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert schedule exceptions"
  ON practice_schedule_exceptions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update schedule exceptions"
  ON practice_schedule_exceptions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete schedule exceptions"
  ON practice_schedule_exceptions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- DONE! Tables are ready to use.
-- ============================================

