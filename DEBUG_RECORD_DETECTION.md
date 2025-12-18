# Debugging Team Record Detection

## What I Just Added

Extensive console logging to track exactly what's happening when checking for record breaks.

## How to Debug

### Step 1: Open Browser Console

1. Press **F12** (or right-click → Inspect)
2. Go to **Console** tab
3. Clear the console (trash icon or Ctrl+L)

### Step 2: Upload Results

Upload your meet results file (with the 49.74 time)

### Step 3: Watch the Console

You should see detailed logs like this:

```
🔍 Checking for team record breaks...
New entries to check: [...]

📋 Checking X results for record breaks...

[1/X] Checking result: Male (15 & Over) 100 Back (Finals) 49.74
  Checking result: {swimmer_id: ..., event: ..., time: ...}
  ✅ Swimmer: Chandler Rose Gender: M
  ✅ Age on 2025-XX-XX : 18
  ✅ Event extracted: Male (15 & Over) 100 Back (Finals) → 100 Back
  ✅ Time converted: 49.74 → 49.74 seconds
  ✅ Age group: 15 & Over | Gender: Male
  🔍 Looking for record: 100 Back 15 & Over Male
  ✅ Found current record: 50.38 by Chandler Rose
  📊 Comparison: 49.74 vs 50.38 → New record? true
  🎉 RECORD BROKEN! {...}
  ✅ Added to record breaks list

🏁 Record check complete. Total breaks: 1
✅ Record check complete. Breaks found: [...]
🎉 Found 1 team record(s) broken! [...]
```

### Step 4: Share the Console Output

**Copy and paste ALL the console output** and send it to me. This will show:
- ✅ What event names are being extracted
- ✅ What age group is being calculated
- ✅ What gender format is being used
- ✅ If the database query is working
- ✅ If records are being found
- ✅ The exact comparison values
- ❌ Any errors that occur

---

## Common Issues and What to Look For

### Issue 1: Event Name Mismatch

**Console shows:**
```
✅ Event extracted: Male (15 & Over) 100 Backstroke (Finals) → 100 Backstroke
🔍 Looking for record: 100 Backstroke 15 & Over Male
✅ Found current record: null
```

**Problem:** Event in results is "100 Backstroke" but team_records has "100 Back"

**Solution:** Either:
- Update results to use "Back" instead of "Backstroke"
- Or update team_records to use "Backstroke"

### Issue 2: Gender Format

**Console shows:**
```
✅ Swimmer: Chandler Rose Gender: M
✅ Age group: 15 & Over | Gender: Male
```

**Should work:** The code now converts M → Male

### Issue 3: Age Calculation Wrong

**Console shows:**
```
✅ Age on 2025-12-12 : 16
✅ Age group: 15 & Over | Gender: Male
🔍 Looking for record: 100 Back 15 & Over Male
```

**Check:** Is the age correct? If birthday is wrong in database, age group will be wrong.

### Issue 4: Time Format

**Console shows:**
```
✅ Time converted: 49.74 → 49.74 seconds
```

**Should work:** Simple format like "49.74" or "1:23.45"

### Issue 5: Database Query Failed

**Console shows:**
```
❌ Error fetching team record: {...}
```

**Problem:** Database connection or RLS policy issue

### Issue 6: Function Crashes

**Console shows:**
```
❌ Error checking for record breaks: Cannot read property 'X' of undefined
```

**Problem:** Code error that needs fixing

---

## Quick Test

If you want to test with a simple query in Supabase SQL Editor:

```sql
-- Check what's in team_records for 100 Back
SELECT * FROM team_records 
WHERE event LIKE '%Back%' 
  AND age_group = '15 & Over' 
  AND gender = 'Male';

-- Check what event names exist in results
SELECT DISTINCT event FROM results 
WHERE event LIKE '%Back%' 
ORDER BY event;
```

Compare the event names - do they match?

---

## After You Share Console Output

Once you share the console logs, I can:
1. See exactly where it's failing
2. Identify the mismatch (event name, age, gender, etc.)
3. Provide a targeted fix
4. Update the code if needed

---

## If No Logs Appear

If you don't see ANY logs in console:

1. **Check console is set to show all logs**
   - Make sure "Verbose" or "All" is selected
   - Not filtered to only "Errors"

2. **Check the import is working**
   - Do you see the success message?
   - Are results being added to database?

3. **Hard refresh**
   - Ctrl + Shift + R to clear cache
   - Make sure new code is loaded

4. **Check for JavaScript errors**
   - Look for red errors in console
   - Might be a syntax error preventing code from running

---

## Summary

The extensive logging will show us EXACTLY what's happening at each step. Please:

1. ✅ Deploy the updated code
2. ✅ Open browser console (F12)
3. ✅ Upload results
4. ✅ Copy ALL console output
5. ✅ Share it with me

Then I can pinpoint the exact issue! 🔍

