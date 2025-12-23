# Practice Builder Fix - team_id Issue

## Problem Summary
When clicking "Open Practice Builder" from the Schedule tab's Create menu, the application failed with a 400 error:
```
null value in column "team_id" of relation "practices" violates not-null constraint
```

## Root Cause
The production database has a `team_id` column in the `practices` table with a NOT NULL constraint, but the code was not providing this value when creating new practices.

## Solution
Added `team_id` lookup from the `team_members` table before creating practices in all relevant locations:

### Files Modified:

1. **src/PracticeBuilder.jsx**
   - `createNewPractice()` - Fetches team_id before creating practice
   - Recurring practice scheduling - Includes team_id in all scheduled practices

2. **src/PracticeHub.jsx**
   - `handleCopyPractice()` - Includes team_id when copying practices

3. **src/TemplateLibrary.jsx**
   - Template to practice conversion - Includes team_id

4. **src/ScheduleHub.jsx**
   - Quick create practice - Includes team_id

### Code Pattern Used:
```javascript
// Get team_id from team_members table
const { data: teamMember } = await supabase
  .from('team_members')
  .select('team_id')
  .eq('user_id', user.id)
  .single();

if (!teamMember || !teamMember.team_id) {
  alert('Unable to create practice: No team association found.');
  return;
}

// Include team_id in practice object
const newPractice = {
  coach_id: user.id,
  created_by: user.id,
  team_id: teamMember.team_id,  // <-- Added this
  title: title,
  // ... rest of fields
};
```

## Testing
1. Open `http://localhost:4175/` (or your preview server port)
2. Log in to your account
3. Test both paths:
   - ✅ Dashboard → "More Actions" → "Practice Builder"
   - ✅ Schedule tab → "Create" → "Open Practice Builder"
4. Both should now work without errors

## Deployment
1. Upload the new `dist` folder contents to production
2. Users may need to hard refresh (Ctrl+Shift+R)
3. The service worker cache version was updated to `goodswim-v2` to force cache invalidation

## Why This Happened
The `team_id` column was added to the production database but not documented in the schema files (`database/practices_schema.sql`). This created a mismatch between the expected database structure and the code.

## Recommendation
Update `database/practices_schema.sql` to include the `team_id` column for future reference:
```sql
CREATE TABLE IF NOT EXISTS practices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,  -- Add this line
  -- ... rest of schema
);
```

