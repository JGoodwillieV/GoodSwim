-- Practice Feature Database Schema
-- Part of MVP (Phase 1) Implementation

-- ============================================
-- PRACTICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS practices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  training_group_id VARCHAR(100),  -- Store group name (e.g., "Senior", "Age Group") or NULL for "all groups"
  
  -- Schedule
  scheduled_date DATE,
  scheduled_time TIME,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'completed', 'canceled')),
  
  -- Calculated Fields (auto-computed from sets)
  total_yards INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  
  -- Tags (stored as array)
  focus_tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- SETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS practice_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID REFERENCES practices(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(100) NOT NULL,  -- e.g., "Warmup", "Main Set"
  order_index INTEGER NOT NULL,
  
  -- Type
  set_type VARCHAR(20) NOT NULL CHECK (set_type IN ('warmup', 'pre_set', 'main_set', 'test_set', 'cooldown', 'dryland')),
  
  -- Test Set Integration (MVP: manual flag)
  is_test_set BOOLEAN DEFAULT FALSE,
  test_set_config JSONB,  -- Store test set configuration
  
  -- Calculated
  total_yards INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SET ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS practice_set_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID REFERENCES practice_sets(id) ON DELETE CASCADE,
  
  -- Order
  order_index INTEGER NOT NULL,
  
  -- Basic Structure
  reps INTEGER NOT NULL DEFAULT 1,
  distance INTEGER NOT NULL,  -- in yards
  stroke VARCHAR(20) NOT NULL CHECK (stroke IN ('free', 'back', 'breast', 'fly', 'IM', 'choice', 'drill', 'kick')),
  
  -- Description & Interval
  description TEXT,  -- e.g., "descend 1-4", "build by 25"
  interval VARCHAR(20),  -- e.g., "1:30", ":15 rest"
  
  -- Equipment (stored as array)
  equipment TEXT[] DEFAULT '{}',  -- e.g., ["fins", "paddles"]
  
  -- Intensity
  intensity VARCHAR(20) CHECK (intensity IN ('easy', 'moderate', 'fast', 'sprint', 'race_pace')),
  
  -- Notes (coach-only)
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRACTICE TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS practice_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Sharing
  is_shared BOOLEAN DEFAULT FALSE,  -- team library vs personal
  
  -- Category (for organization)
  category TEXT[] DEFAULT '{}',  -- e.g., ["age_group", "sprint"]
  
  -- Template Data (stores full practice structure as JSON)
  template_data JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Practices
CREATE INDEX IF NOT EXISTS idx_practices_coach ON practices(coach_id);
CREATE INDEX IF NOT EXISTS idx_practices_date ON practices(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_practices_status ON practices(status);
CREATE INDEX IF NOT EXISTS idx_practices_group ON practices(training_group_id);

-- Sets
CREATE INDEX IF NOT EXISTS idx_sets_practice ON practice_sets(practice_id);
CREATE INDEX IF NOT EXISTS idx_sets_order ON practice_sets(practice_id, order_index);

-- Set Items
CREATE INDEX IF NOT EXISTS idx_set_items_set ON practice_set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_set_items_order ON practice_set_items(set_id, order_index);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_coach ON practice_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_templates_shared ON practice_templates(is_shared);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Practices
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practices"
  ON practices FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = created_by);

CREATE POLICY "Users can create practices"
  ON practices FOR INSERT
  WITH CHECK (auth.uid() = coach_id OR auth.uid() = created_by);

CREATE POLICY "Users can update their own practices"
  ON practices FOR UPDATE
  USING (auth.uid() = coach_id OR auth.uid() = created_by);

CREATE POLICY "Users can delete their own practices"
  ON practices FOR DELETE
  USING (auth.uid() = coach_id OR auth.uid() = created_by);

-- Sets
ALTER TABLE practice_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sets in their practices"
  ON practice_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM practices 
      WHERE practices.id = practice_sets.practice_id 
      AND (practices.coach_id = auth.uid() OR practices.created_by = auth.uid())
    )
  );

-- Set Items
ALTER TABLE practice_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items in their sets"
  ON practice_set_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM practice_sets
      JOIN practices ON practices.id = practice_sets.practice_id
      WHERE practice_sets.id = practice_set_items.set_id
      AND (practices.coach_id = auth.uid() OR practices.created_by = auth.uid())
    )
  );

-- Templates
ALTER TABLE practice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own and shared templates"
  ON practice_templates FOR SELECT
  USING (auth.uid() = coach_id OR is_shared = true);

CREATE POLICY "Users can create templates"
  ON practice_templates FOR INSERT
  WITH CHECK (auth.uid() = coach_id OR auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON practice_templates FOR UPDATE
  USING (auth.uid() = coach_id OR auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
  ON practice_templates FOR DELETE
  USING (auth.uid() = coach_id OR auth.uid() = created_by);

-- ============================================
-- FUNCTIONS FOR AUTO-CALCULATION
-- ============================================

-- Function to calculate total yards for a set
CREATE OR REPLACE FUNCTION calculate_set_yards()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE practice_sets
  SET total_yards = (
    SELECT COALESCE(SUM(reps * distance), 0)
    FROM practice_set_items
    WHERE set_id = NEW.set_id
  )
  WHERE id = NEW.set_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate set yards when items change
CREATE TRIGGER update_set_yards_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON practice_set_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_set_yards();

-- Function to calculate total yards for a practice
CREATE OR REPLACE FUNCTION calculate_practice_yards()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE practices
  SET total_yards = (
    SELECT COALESCE(SUM(total_yards), 0)
    FROM practice_sets
    WHERE practice_id = NEW.practice_id
  ),
  updated_at = NOW()
  WHERE id = NEW.practice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate practice yards when sets change
CREATE TRIGGER update_practice_yards_on_set_change
  AFTER INSERT OR UPDATE OR DELETE ON practice_sets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_practice_yards();

