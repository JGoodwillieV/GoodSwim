# Fix: 500 Error When Loading Test Sets

## Problem
Getting 500 errors when trying to load test sets:
```
Failed to load resource: the server responded with a status of 500
Error fetching test sets
```

## Root Cause
The `test_sets` and `test_set_results` tables exist but don't have proper Row Level Security (RLS) policies configured. This causes Supabase to reject queries from parent users.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Fix
1. Open the file `database/test_sets_rls_fix.sql` in your code editor
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 3: Verify
You should see a success message. The script will:
- ✅ Enable RLS on both tables
- ✅ Remove any conflicting old policies
- ✅ Create new policies for coaches
- ✅ Create new policies for parents
- ✅ Add foreign key constraints if missing
- ✅ Add performance indexes

### Step 4: Test
1. Refresh your StormTracker app
2. Log in as a parent
3. Navigate to a swimmer
4. Click the **Practice** tab
5. You should now see test sets! 🎉

## What If It Still Doesn't Work?

### Check the browser console again:
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for any new errors

### Verify policies were created:
Run this in Supabase SQL Editor:
```sql
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('test_sets', 'test_set_results')
ORDER BY tablename, policyname;
```

You should see 4 policies:
- `coaches_all_own_test_sets` (test_sets)
- `parents_view_test_sets` (test_sets)
- `coaches_all_test_set_results` (test_set_results)
- `parents_view_test_set_results` (test_set_results)

### Check if foreign key exists:
```sql
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'test_set_results'
  AND tc.constraint_type = 'FOREIGN KEY';
```

## Still Having Issues?
Share:
1. The browser console errors
2. The output of the policy verification query
3. Whether you're logged in as a coach or parent

