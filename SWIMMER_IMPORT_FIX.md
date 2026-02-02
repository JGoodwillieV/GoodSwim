# Swimmer Import Fix - team_id Issue

## Problem Summary
When uploading an SD3 file to import swimmers (testing the first 25 swimmers limit), the application failed with:
```
Error importing: new row violates row-level security policy for table "swimmers"
```

## Root Cause
Same as the practice builder issue - the `swimmers` table requires a `team_id` column, but the import code wasn't providing it when creating new swimmer records.

## Solution
Added `team_id` lookup from the `team_members` table before importing swimmers in all relevant locations:

### Files Modified:

1. **src/components/Roster.jsx**
   - `parseSD3Roster()` - Fetches team_id before parsing SD3 file and includes it in all imported swimmers
   - `handleAddManual()` - Includes team_id when manually adding a swimmer

### Code Changes:

**SD3 Import:**
```javascript
const parseSD3Roster = async (text) => {
  const lines = text.split(/\r\n|\n/);
  const newEntries = [];
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get team_id from team_members table
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single();

  if (!teamMember || !teamMember.team_id) {
    throw new Error('No team association found for your account.');
  }
  
  // ... parse swimmers ...
  
  newEntries.push({ 
    name: formattedName, 
    group_name: 'Imported', 
    status: 'New', 
    efficiency_score: 70, 
    age, 
    gender, 
    coach_id: user.id,
    team_id: teamMember.team_id  // <-- Added this
  });
};
```

**Manual Add:**
```javascript
const handleAddManual = async () => {
  const name = window.prompt('Enter Swimmer Name:');
  if (!name) return;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get team_id from team_members table
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single();

  if (!teamMember || !teamMember.team_id) {
    alert('Unable to add swimmer: No team association found.');
    return;
  }
  
  const newSwimmer = { 
    name, 
    group_name: 'Unassigned', 
    status: 'New', 
    efficiency_score: 50, 
    coach_id: user.id,
    team_id: teamMember.team_id  // <-- Added this
  };
  
  const { data, error } = await supabase.from('swimmers').insert([newSwimmer]).select();
  if (!error) setSwimmers(prev => [...prev, ...data]);
};
```

## Testing
1. Go to Team Roster
2. Click "Import" button
3. Select "Roster (SD3)" option
4. Upload an SD3 file
5. Should successfully import swimmers (respecting the 25 swimmer limit if implemented)
6. Also test manually adding a swimmer

## Related Issues
This is the same root cause as the Practice Builder issue - the `team_id` column exists in production but wasn't documented in schema files, causing RLS policy violations when inserting records without it.

## Recommendation
- Update database schema documentation to include `team_id` in the `swimmers` table
- Audit all other tables that might have similar undocumented `team_id` requirements
- Consider creating a helper function to fetch team_id to avoid code duplication

