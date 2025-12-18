-- Calendar Events Schema - RLS Policy Fix
-- This fixes the "permission denied for table users" error

-- First, drop the existing policies
DROP POLICY IF EXISTS "Everyone can view team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can insert team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can update team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can delete team events" ON team_events;

-- Recreate policies using user_profiles instead of auth.users

-- SELECT: Everyone can view events (with visibility filters)
CREATE POLICY "Everyone can view team events" 
  ON team_events FOR SELECT 
  USING (
    visible_to = 'everyone' OR
    (visible_to = 'parents_only' AND auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'parent')) OR
    (visible_to = 'coaches_only' AND auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'))
  );

-- INSERT: Only coaches can create events
CREATE POLICY "Only coaches can insert team events" 
  ON team_events FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'));

-- UPDATE: Only coaches can update events
CREATE POLICY "Only coaches can update team events" 
  ON team_events FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'));

-- DELETE: Only coaches can delete events
CREATE POLICY "Only coaches can delete team events" 
  ON team_events FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'));

-- If you get errors about user_profiles not existing, you may need simpler policies:
-- Uncomment these and comment out the above if needed:

/*
-- Simplified policies (if user_profiles table doesn't exist)
DROP POLICY IF EXISTS "Everyone can view team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can insert team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can update team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can delete team events" ON team_events;

-- Allow everyone to read (you can add visibility logic in your app)
CREATE POLICY "Anyone can view team events" 
  ON team_events FOR SELECT 
  USING (true);

-- Only authenticated users can create/edit/delete
-- (You can add additional role checks in your application layer)
CREATE POLICY "Authenticated users can insert team events" 
  ON team_events FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update team events" 
  ON team_events FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete team events" 
  ON team_events FOR DELETE 
  USING (auth.role() = 'authenticated');
*/

