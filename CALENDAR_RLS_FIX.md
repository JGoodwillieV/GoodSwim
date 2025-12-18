# Calendar RLS Policy Fix

## Issue
Getting "permission denied for table users" error when trying to load calendar events.

## Root Cause
The original RLS policies were trying to access `auth.users` table, which requires special permissions that regular users don't have. This is a Supabase security restriction.

## Solution
Update the RLS policies to use the `user_profiles` table instead (which you're already using for role management).

## Fix Instructions

### Option 1: Using user_profiles (Recommended)

Run this SQL in Supabase SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can insert team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can update team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can delete team events" ON team_events;

-- Recreate policies using user_profiles
CREATE POLICY "Everyone can view team events" 
  ON team_events FOR SELECT 
  USING (
    visible_to = 'everyone' OR
    (visible_to = 'parents_only' AND auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'parent')) OR
    (visible_to = 'coaches_only' AND auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'))
  );

CREATE POLICY "Only coaches can insert team events" 
  ON team_events FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'));

CREATE POLICY "Only coaches can update team events" 
  ON team_events FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'));

CREATE POLICY "Only coaches can delete team events" 
  ON team_events FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'coach'));
```

### Option 2: Simplified Policies (If Option 1 doesn't work)

If you get errors with `user_profiles`, use these simpler policies:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can insert team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can update team events" ON team_events;
DROP POLICY IF EXISTS "Only coaches can delete team events" ON team_events;

-- Simple policies for authenticated users
CREATE POLICY "Anyone can view team events" 
  ON team_events FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert team events" 
  ON team_events FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update team events" 
  ON team_events FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete team events" 
  ON team_events FOR DELETE 
  USING (auth.role() = 'authenticated');
```

## Additional Fix: Past Events Filter

Also fixed the date filtering logic in `CalendarManager.jsx` to properly show past events by comparing against end of day instead of start of day.

## Testing After Fix

1. **Test as Coach:**
   - Navigate to Calendar
   - Should see events without 403 error
   - Try creating a new event
   - Verify it appears in the list

2. **Test as Parent:**
   - Navigate to Calendar tab
   - Should see events without 403 error
   - Verify meets and practices appear
   - Test export functionality

3. **Check Console:**
   - Should see no 403 errors
   - Events should load successfully

## Verification Queries

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if user_profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'user_profiles'
);

-- Check RLS policies on team_events
SELECT * FROM pg_policies WHERE tablename = 'team_events';

-- Verify you can query team_events
SELECT COUNT(*) FROM team_events;
```

## If Still Having Issues

1. **Check RLS is enabled:**
   ```sql
   SELECT relname, relrowsecurity 
   FROM pg_class 
   WHERE relname = 'team_events';
   ```
   Should show `relrowsecurity = true`

2. **Temporarily disable RLS for testing:**
   ```sql
   ALTER TABLE team_events DISABLE ROW LEVEL SECURITY;
   ```
   (Re-enable after testing!)

3. **Check your user role:**
   ```sql
   SELECT * FROM user_profiles WHERE id = auth.uid();
   ```

## Status
- [x] Identified issue (auth.users permission error)
- [x] Created fix SQL script
- [x] Fixed date filtering for past events
- [ ] Apply fix to production database
- [ ] Test as coach and parent
- [ ] Verify no console errors

