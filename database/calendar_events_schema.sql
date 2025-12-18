-- Calendar Events Schema
-- Allows coaches to add custom team events to the calendar
-- Integrates with meets and practices for a unified calendar view

-- ============================================
-- TEAM EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('social', 'office_hours', 'team_meeting', 'fundraiser', 'volunteer', 'other')),
  
  -- Date/Time
  start_date DATE NOT NULL,
  end_date DATE,  -- Optional, for multi-day events
  start_time TIME,  -- Optional
  end_time TIME,  -- Optional
  all_day BOOLEAN DEFAULT false,
  
  -- Location
  location_name VARCHAR(200),
  location_address TEXT,
  
  -- Target Audience
  target_groups TEXT[] DEFAULT '{}',  -- Empty = all groups, or specific group names
  
  -- Visibility
  visible_to VARCHAR(20) DEFAULT 'everyone' CHECK (visible_to IN ('everyone', 'parents_only', 'coaches_only')),
  
  -- Additional Info
  contact_name VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  external_link TEXT,  -- For registration, more info, etc.
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_team_events_date ON team_events(start_date);
CREATE INDEX IF NOT EXISTS idx_team_events_type ON team_events(event_type);
CREATE INDEX IF NOT EXISTS idx_team_events_visibility ON team_events(visible_to);
CREATE INDEX IF NOT EXISTS idx_team_events_groups ON team_events USING GIN(target_groups);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE team_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view events (parents and coaches)
CREATE POLICY "Everyone can view team events" 
  ON team_events FOR SELECT 
  USING (
    visible_to = 'everyone' OR
    (visible_to = 'parents_only' AND auth.uid() IN (SELECT user_id FROM parents)) OR
    (visible_to = 'coaches_only' AND auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'))
  );

-- Only coaches can create/edit events
CREATE POLICY "Only coaches can insert team events" 
  ON team_events FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

CREATE POLICY "Only coaches can update team events" 
  ON team_events FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

CREATE POLICY "Only coaches can delete team events" 
  ON team_events FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'coach'));

-- ============================================
-- FUNCTION: Get Combined Calendar Events
-- ============================================
-- This function combines team_events, meets, and practices into a unified calendar view
-- Filtered by user role and swimmer groups

CREATE OR REPLACE FUNCTION get_calendar_events(
  user_groups TEXT[] DEFAULT '{}',
  include_meets BOOLEAN DEFAULT true,
  include_practices BOOLEAN DEFAULT true,
  include_team_events BOOLEAN DEFAULT true,
  start_filter DATE DEFAULT NULL,
  end_filter DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source VARCHAR(20),
  title VARCHAR(200),
  description TEXT,
  event_type VARCHAR(50),
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN,
  location_name VARCHAR(200),
  location_address TEXT,
  icon_type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  
  -- Team Events
  SELECT 
    te.id,
    'team_event'::VARCHAR(20) as source,
    te.title,
    te.description,
    te.event_type,
    te.start_date,
    te.end_date,
    te.start_time,
    te.end_time,
    te.all_day,
    te.location_name,
    te.location_address,
    te.event_type as icon_type
  FROM team_events te
  WHERE 
    include_team_events
    AND (start_filter IS NULL OR te.start_date >= start_filter)
    AND (end_filter IS NULL OR te.start_date <= end_filter)
    AND (
      cardinality(te.target_groups) = 0  -- All groups
      OR user_groups && te.target_groups  -- Group overlap
    )
    
  UNION ALL
  
  -- Meets
  SELECT 
    m.id,
    'meet'::VARCHAR(20) as source,
    m.name as title,
    NULL::TEXT as description,
    'meet'::VARCHAR(50) as event_type,
    m.start_date,
    m.end_date,
    NULL::TIME as start_time,
    NULL::TIME as end_time,
    true as all_day,
    m.location_name,
    m.location_address,
    'meet'::VARCHAR(20) as icon_type
  FROM meets m
  WHERE 
    include_meets
    AND m.status IN ('open', 'closed', 'completed')
    AND (start_filter IS NULL OR m.start_date >= start_filter)
    AND (end_filter IS NULL OR m.start_date <= end_filter)
    
  UNION ALL
  
  -- Practices
  SELECT 
    p.id,
    'practice'::VARCHAR(20) as source,
    p.title,
    p.description,
    'practice'::VARCHAR(50) as event_type,
    p.scheduled_date as start_date,
    NULL::DATE as end_date,
    p.scheduled_time as start_time,
    NULL::TIME as end_time,
    false as all_day,
    NULL::VARCHAR(200) as location_name,
    NULL::TEXT as location_address,
    'practice'::VARCHAR(20) as icon_type
  FROM practices p
  WHERE 
    include_practices
    AND p.status = 'scheduled'
    AND (start_filter IS NULL OR p.scheduled_date >= start_filter)
    AND (end_filter IS NULL OR p.scheduled_date <= end_filter)
    AND (
      p.training_group_id IS NULL  -- All groups
      OR p.training_group_id = ANY(user_groups)  -- Specific group
    )
  
  ORDER BY start_date ASC, start_time ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

