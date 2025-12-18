# Practice Schedule Feature

This feature allows coaches to set up recurring weekly practice schedules for each training group, with the ability to manage exceptions (holidays, schedule changes). Parents see a filtered view showing only their swimmer's group schedule.

## 🗄️ Database Setup

Run the SQL in `database/practice_schedules_schema.sql` in your Supabase SQL Editor:

```sql
-- This creates:
-- 1. practice_schedules - Recurring weekly schedule templates
-- 2. practice_schedule_exceptions - Holidays, cancellations, modifications
-- 3. practice_schedule_groups - Optional group metadata
-- 4. Helper functions for querying schedules
```

## 🎯 Features

### For Coaches

**Practice Schedule Manager** (`/schedule` → Create → "⚡ Manage Practice Times")

1. **Grid-Based View**: Groups as rows, days as columns
2. **Easy Time Entry**: Click any cell to add/edit practice times
3. **Multiple Activities**: Support for Swim, Dryland, AM/PM Doubles
4. **Season Management**: Set season start/end dates
5. **Group Management**: Add groups matching your team structure (CAT 1, CAT 2, etc.)

**Exception Handling**:
- Mark holidays (single day or date range)
- Modify times for specific days
- Apply to all groups or specific groups
- Common presets: Winter Break, Thanksgiving, Meet Weekend, etc.

### For Parents

**Practice Schedule Card** (on Parent Dashboard)

- Shows weekly schedule filtered to their swimmer's group(s)
- Week navigation (prev/next/today)
- Visual indicators for:
  - ✅ Regular practice times
  - 🔴 Canceled practices (with reason)
  - 🟡 Modified times
- Activity legend (Swim, Dryland, etc.)

## 📁 Files Created/Modified

### New Files
- `database/practice_schedules_schema.sql` - Database schema
- `src/PracticeScheduleManager.jsx` - Coach schedule builder
- `src/ParentPracticeSchedule.jsx` - Parent schedule view component

### Modified Files
- `src/App.jsx` - Added route for practice-schedule
- `src/ScheduleHub.jsx` - Added link to Practice Schedule Manager
- `src/ParentDashboard.jsx` - Added PracticeScheduleCard

## 🚀 Usage

### Coach: Setting Up a Season Schedule

1. Go to **Schedule** from the sidebar
2. Click **Create** → **⚡ Manage Practice Times**
3. Click **Season Settings** to set the season dates (e.g., Sep 1 - May 31)
4. Click **Add Group** to add your training groups (CAT 1 Early, CAT 2, etc.)
5. Click on any empty cell to add practice times
6. For each time slot, set:
   - Activity type (Swim, Dryland, AM/PM)
   - Start and end times
   - Location (optional)
   - Notes (optional)

### Coach: Marking Holidays

1. In Practice Schedule Manager, click **Add Exception**
2. Select:
   - **Canceled**: No practice (shows reason to parents)
   - **Modified**: Different time than usual
   - **Added**: Extra practice not in regular schedule
3. Set date range (e.g., Dec 23 - Jan 2 for Winter Break)
4. Select which groups (or all groups)
5. Enter reason (e.g., "Winter Break")

### Parents: Viewing the Schedule

- The **Practice Schedule Card** appears on the parent dashboard
- Shows only their swimmer's group schedule
- Navigate weeks with arrows or "Today" button
- Canceled/modified practices are clearly marked

## 📝 Example Schedule (from PDF)

Based on the Hanover Hurricanes schedule:

| Group | Mon-Thu | Friday | Saturday |
|-------|---------|--------|----------|
| Tropical Storms | 3:30-4:30 PM | 3:30-4:30 PM | — |
| CAT 1 Early | 3:30-4:30 PM | 3:30-4:30 PM | 9:00-10:00 AM |
| CAT 2 Early (Swim) | 3:30-4:45 PM | 3:30-4:45 PM | 9:00-10:15 AM |
| CAT 2 Early (Dryland) | 4:50-5:15 PM | — | — |
| CAT 3 (Dryland) | 6:00-6:25 PM | — | — |
| CAT 3 (Swim) | 6:30-8:00 PM | 5:00-6:30 PM | 9:00-10:30 AM |

## 🔗 Integration Points

### With Practice Builder
- Future: Click a scheduled day to open Practice Builder with pre-filled group/time
- Future: Show which days have workout content attached

### With Calendar
- Practice schedule times appear in the unified calendar view
- Exceptions sync with calendar for accurate display

## 🎨 UI Components

### TimeSlotModal
Modal for adding/editing practice time slots with:
- Activity type selection (Swim/Dryland/AM/PM)
- Time range inputs
- Location field
- Notes field

### ExceptionModal
Modal for creating schedule exceptions:
- Exception type (Canceled/Modified/Added)
- Date range picker
- Group selector
- Preset reasons dropdown

### GroupModal
Quick add for training groups with hurricane-themed presets.

### SeasonModal
Configure active season dates.

## ⚡ Quick Tips

1. **Start with groups**: Add all your training groups first
2. **Set season dates**: This determines when schedules are active
3. **Copy patterns**: If groups have similar times, edit one and use as reference
4. **Bulk holidays**: Use date ranges for multi-day breaks
5. **Notes are visible**: Parents see notes, use for important info

## 🐛 Troubleshooting

**"Failed to save time slot"**
- Make sure you've run the database schema SQL
- Check that season dates are set

**Parents don't see schedule**
- Verify swimmer is assigned to a training group
- Check that group name in swimmer profile matches exactly
- Confirm season dates include current date

**Schedule not showing for a day**
- Check if there's an exception for that date
- Verify day_of_week is correct (0=Sunday, 6=Saturday)

