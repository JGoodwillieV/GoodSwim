# Timezone Date Bug Fix

## Problem
When importing meet results from a spreadsheet with dates like 9/27/2025-9/28/2025:
- The `results` table in Supabase showed 9/28/2025-9/29/2025 (one day forward)
- Swimmer profiles showed 9/26/2025-9/27/2025 (one day backward)

## Root Cause
This was a classic **timezone conversion bug** that occurred in two places:

### 1. When Importing (Storing to Database)
**Location:** `src/App.jsx` line 824-833

When Excel files were parsed with `cellDates: true`, dates became JavaScript Date objects at midnight in the **local timezone**. Calling `.toISOString()` converted them to UTC, which shifted the date forward or backward depending on the timezone.

**Example:**
- Excel date: September 27, 2025 (midnight local time)
- JavaScript Date object: `2025-09-27T00:00:00-07:00` (Pacific Time)
- After `.toISOString()`: `2025-09-27T07:00:00Z` 
- After `.split('T')[0]`: `2025-09-27` ✓ (but this could be `2025-09-28` in some timezones)

**Fix:**
```javascript
// OLD (incorrect):
cleanDate = dateVal.toISOString().split('T')[0];

// NEW (correct):
const year = dateVal.getFullYear();
const month = String(dateVal.getMonth() + 1).padStart(2, '0');
const day = String(dateVal.getDate()).padStart(2, '0');
cleanDate = `${year}-${month}-${day}`;
```

### 2. When Displaying (Reading from Database)
**Location:** Multiple files (App.jsx, ParentMeetsView.jsx, MeetsManager.jsx, etc.)

When displaying dates, the code used `new Date(dateString).toLocaleDateString()`. Date strings from Supabase like `"2025-09-27"` were interpreted as **midnight UTC**, then converted to local time, shifting the date again.

**Example:**
- Database value: `"2025-09-27"` (no timezone, interpreted as UTC)
- JavaScript Date: `2025-09-27T00:00:00Z`
- In Pacific Time (UTC-7): `2025-09-26T17:00:00-07:00`
- After `.toLocaleDateString()`: `9/26/2025` ✗ (one day off!)

**Fix:**
```javascript
// OLD (incorrect):
new Date(group.date).toLocaleDateString()

// NEW (correct):
const [year, month, day] = dateString.split('T')[0].split('-');
const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
return dateObj.toLocaleDateString();
```

By manually parsing the year, month, and day and creating a Date object in the **local timezone**, we avoid the UTC conversion issue.

## Files Modified
1. **src/App.jsx** - Fixed import date parsing and display in swimmer profile
2. **src/ParentMeetsView.jsx** - Fixed date display in parent views
3. **src/MeetsManager.jsx** - Fixed date display in meets manager
4. **src/RecordBreakModal.jsx** - Fixed date display in record break notifications
5. **src/Reports.jsx** - Fixed date display in reports
6. **src/ParentDashboard.jsx** - Fixed date display in parent dashboard
7. **src/MotivationalTimesChart.jsx** - Fixed date display in charts
8. **src/MeetEntriesManager.jsx** - Fixed date display in meet entries
9. **src/ActionCenter.jsx** - Fixed date display in action center

## Testing
To verify the fix:
1. Import a spreadsheet with meet results dated 9/27/2025
2. Check the `results` table in Supabase - should show `2025-09-27`
3. View the swimmer's profile and click "Meet Results" - should display `9/27/2025`
4. All three places (import file, database, display) should now show the same date

## Key Takeaway
When working with date-only values (no time component):
- **Storing:** Extract year/month/day from Date objects directly, don't use `.toISOString()`
- **Displaying:** Parse YYYY-MM-DD strings manually and create Date objects in local timezone
- **Never** let JavaScript auto-convert between UTC and local time for date-only values

