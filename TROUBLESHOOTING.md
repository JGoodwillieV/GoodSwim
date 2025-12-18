# Team Records Troubleshooting Guide

## Issue: Team Records Not Showing in View Ladder

---

## ⚡ QUICK FIX: 406 Error - Gender Mismatch

**If you see this error in console:**
```
406 (Not Acceptable) ... gender=eq.M ...
```

**Problem**: Your swimmers table uses "M"/"F" but team_records uses "Male"/"Female"

**Solution**: Already fixed in the code! Just redeploy:
```bash
git add src/StandardsModal.jsx
git commit -m "Fix gender format for team records"
git push
```

Vercel will redeploy and it should work! ✅

---

## Full Diagnostic Steps

Follow these steps in order to diagnose the issue:

---

## Step 1: Verify Data Was Actually Loaded

In Supabase SQL Editor, run:

```sql
-- Check if table has data
SELECT COUNT(*) as total_records FROM team_records;
```

**Expected**: Should return ~186 records

**If it returns 0**: The INSERT SQL didn't run properly. Re-run `team_records_insert.sql`

---

## Step 2: Check A Specific Record

```sql
-- Look for a common event (50 Free for 11/12 Girls)
SELECT * FROM team_records 
WHERE event = '50 Free' 
  AND age_group = '11/12' 
  AND gender = 'Female';
```

**Expected**: Should return 1 row with Reagan Strohhacker, 24.91

**If empty**: Data didn't load. Re-run the INSERT SQL.

---

## Step 3: Check What Swimmer Data You're Testing With

You need to know:
- **Swimmer's Age**: ___
- **Swimmer's Gender**: ___
- **Event Name in their results**: ___

To find this, in Supabase run:

```sql
-- Replace SWIMMER_ID with actual ID
SELECT id, name, birthday, gender FROM swimmers WHERE id = 'SWIMMER_ID';

-- Check their results
SELECT event, time, date FROM results WHERE swimmer_id = 'SWIMMER_ID' ORDER BY date DESC LIMIT 10;
```

Note the exact event name format (e.g., "50 Free" vs "50 Freestyle")

---

## Step 4: Check Event Name Match

**MOST COMMON ISSUE**: Event names must match EXACTLY between `results` and `team_records`.

In Supabase SQL Editor:

```sql
-- See what event names exist in results
SELECT DISTINCT event FROM results WHERE event LIKE '%Free%' ORDER BY event;

-- Compare to team_records
SELECT DISTINCT event FROM team_records WHERE event LIKE '%Free%' ORDER BY event;
```

**Common Mismatches**:
- Results: "Female (11/12) 50 Free (Prelim)"
- Team Records: "50 Free" ✅

The code extracts just "50 Free" from the full event name, but let's verify the extraction works.

---

## Step 5: Check Browser Console for Errors

1. Open your StormTracker app
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Navigate to a swimmer profile
5. Click "View Ladder"
6. **Look for any red error messages**

Common errors:
- `Failed to fetch` → Network/Supabase connection issue
- `null is not an object` → Data format issue
- `Permission denied` → RLS policy issue

**Screenshot or copy the error message**

---

## Step 6: Check Row Level Security (RLS) Policies

In Supabase, go to **Authentication → Policies**

Find the `team_records` table. Should have:
- ✅ **"Team records are viewable by everyone"** - SELECT policy - ENABLED

If missing, run this in SQL Editor:

```sql
-- Drop old policy if exists
DROP POLICY IF EXISTS "Team records are viewable by everyone" ON team_records;

-- Recreate policy
CREATE POLICY "Team records are viewable by everyone" 
  ON team_records FOR SELECT 
  USING (true);
```

---

## Step 7: Check Network Tab

With Developer Tools open (F12):

1. Go to **Network** tab
2. Click "View Ladder"
3. Look for a request to Supabase (contains `team_records`)
4. Click on that request
5. Check **Response** tab

**If no request appears**: The code isn't executing. Check console for JS errors.

**If request returns empty array `[]`**: Query conditions don't match any records.

**If request shows data**: The problem is in rendering, not fetching.

---

## Step 8: Verify Age Group Calculation

The app calculates age group from the swimmer's birthday:

```javascript
if (age <= 8) return '8 & Under';
if (age <= 10) return '9/10';
if (age <= 12) return '11/12';
if (age <= 14) return '13/14';
return '15 & Over';
```

Check in Supabase:

```sql
-- See swimmer's current age
SELECT 
  name, 
  birthday, 
  EXTRACT(YEAR FROM AGE(birthday)) as current_age,
  CASE
    WHEN EXTRACT(YEAR FROM AGE(birthday)) <= 8 THEN '8 & Under'
    WHEN EXTRACT(YEAR FROM AGE(birthday)) <= 10 THEN '9/10'
    WHEN EXTRACT(YEAR FROM AGE(birthday)) <= 12 THEN '11/12'
    WHEN EXTRACT(YEAR FROM AGE(birthday)) <= 14 THEN '13/14'
    ELSE '15 & Over'
  END as age_group
FROM swimmers 
WHERE id = 'SWIMMER_ID';
```

Does the age_group match what's in team_records for that event?

---

## Step 9: Manual Test Query

Build the exact query the app should be running:

```sql
-- Replace these values with your actual data:
-- event_name: from Step 3
-- age_group: from Step 8
-- gender: from Step 3

SELECT * FROM team_records 
WHERE event = '50 Free'           -- Your event name
  AND age_group = '11/12'          -- Calculated age group
  AND gender = 'Female'            -- Swimmer's gender
  AND course = 'SCY';

-- Should return 1 row if a record exists
```

**If this returns data**: The issue is in the code
**If this returns nothing**: Event name, age group, or gender don't match

---

## Step 10: Check Code Is Deployed

If deploying to Vercel:

1. Check your last deployment includes the modified files
2. Verify git commit included:
   - `src/StandardsModal.jsx`
   - `src/Standards.jsx`
3. Check Vercel deployment logs for errors
4. Try hard refresh: **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)

---

## Quick Diagnostic Script

Run this all-in-one query in Supabase to see everything:

```sql
-- Summary of what's in the database
SELECT 'Total Records' as check_name, COUNT(*)::text as result FROM team_records
UNION ALL
SELECT 'Events Count', COUNT(DISTINCT event)::text FROM team_records
UNION ALL
SELECT 'Age Groups', string_agg(DISTINCT age_group, ', ') FROM team_records
UNION ALL
SELECT '50 Free Records', COUNT(*)::text FROM team_records WHERE event = '50 Free'
UNION ALL
SELECT 'Total Swimmers', COUNT(*)::text FROM swimmers
UNION ALL
SELECT 'Swimmers with Results', COUNT(DISTINCT swimmer_id)::text FROM results;

-- Show sample records
SELECT * FROM team_records WHERE event IN ('50 Free', '100 Free', '50 Back') LIMIT 10;
```

---

## Common Solutions

### Solution A: Event Name Mismatch

**Problem**: Results have "50 Freestyle" but records have "50 Free"

**Fix**: Update team_records to match your results format:

```sql
UPDATE team_records SET event = '50 Freestyle' WHERE event = '50 Free';
```

Or vice versa.

---

### Solution B: No Results for That Swimmer

**Problem**: Swimmer doesn't have recorded times yet

**Fix**: Upload meet results first, then check team records

---

### Solution C: Wrong Age Calculated

**Problem**: Swimmer's birthday is incorrect in database

**Fix**: Update birthday:

```sql
UPDATE swimmers SET birthday = '2012-06-15' WHERE id = 'SWIMMER_ID';
```

---

### Solution D: RLS Policy Blocking

**Problem**: Row Level Security preventing reads

**Fix**: Re-run the RLS policy SQL from Step 6

---

### Solution E: Cache Issue

**Problem**: Old code cached in browser

**Fix**: 
1. Hard refresh: Ctrl + Shift + R
2. Clear browser cache
3. Try incognito/private window

---

## Report Template

If still not working, gather this info:

```
1. Total records in team_records table: ___
2. Swimmer ID being tested: ___
3. Swimmer's age: ___
4. Swimmer's gender: ___
5. Event name from results table: ___
6. Browser console errors (screenshot): ___
7. Network tab shows request to team_records: YES / NO
8. Query from Step 9 returns data: YES / NO
9. Code deployed to Vercel: YES / NO
10. Hard refresh tried: YES / NO
```

---

## Need More Help?

Check these in order:
1. This troubleshooting guide (you are here)
2. Browser console (F12) for errors
3. Supabase logs (Project → Logs)
4. `database/README.md` for setup verification

Most issues are:
- ✅ Event name mismatch (60%)
- ✅ Data not loaded (20%)
- ✅ RLS policy (10%)
- ✅ Cache/deployment (10%)

