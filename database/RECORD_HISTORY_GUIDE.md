# Record History Tracking System

## Overview

The system now automatically tracks **every team record break** in a historical log. This allows you to:
- See record progression over time
- Generate reports on improvements
- Analyze which events had the most activity
- Celebrate swimmers who pushed records forward

---

## How It Works

### Automatic Logging

Every time a record is updated:
1. ✅ **New entry created** in `record_history` table
2. ✅ **Previous record marked** as superseded (with `held_until` timestamp)
3. ✅ **Current record updated** in `team_records` table

### What's Tracked

For each record break:
- **Event, Age Group, Gender** - What record was broken
- **Swimmer** - Who broke it (name and ID)
- **Time** - New record time
- **Date** - When they swam it
- **Previous Holder** - Who had the record before
- **Previous Time** - What the old record was
- **Improvement** - How much faster (in seconds)
- **Broken At** - Timestamp when record was logged
- **Held Until** - When this record was broken (null if current)

---

## Database Schema

### record_history Table

```sql
CREATE TABLE record_history (
  id UUID PRIMARY KEY,
  event VARCHAR(100),
  age_group VARCHAR(20),
  gender VARCHAR(10),
  swimmer_id UUID,
  swimmer_name VARCHAR(100),
  time_seconds DECIMAL(10, 2),
  time_display VARCHAR(20),
  date DATE,                          -- When they swam it
  course VARCHAR(10),
  
  previous_record_holder VARCHAR(100),
  previous_time_seconds DECIMAL(10, 2),
  previous_time_display VARCHAR(20),
  improvement_seconds DECIMAL(10, 2),
  
  broken_at TIMESTAMP,                -- When record was logged
  held_until TIMESTAMP,               -- When broken by someone else
  superseded_by UUID,                 -- ID of record that broke this
  
  created_at TIMESTAMP
);
```

---

## Example Reports & Queries

### Report 1: Most Active Events (Records Broken Most Often)

```sql
SELECT 
  event,
  age_group,
  gender,
  COUNT(*) as times_broken,
  MIN(time_seconds) as fastest_ever,
  MAX(time_seconds) as slowest_recorded,
  MAX(time_seconds) - MIN(time_seconds) as total_improvement
FROM record_history
WHERE EXTRACT(YEAR FROM date) = 2025  -- This year only
GROUP BY event, age_group, gender
ORDER BY times_broken DESC
LIMIT 10;
```

**Example Output:**
```
event      age_group   gender  times_broken  fastest_ever  total_improvement
100 Fly    9/10        Female  7            1:05.23       3.24
50 Free    11/12       Male    5            23.45         1.87
```

---

### Report 2: Record Progression for Specific Event

```sql
SELECT 
  swimmer_name,
  time_display,
  date,
  previous_record_holder,
  previous_time_display,
  improvement_seconds,
  broken_at,
  CASE 
    WHEN held_until IS NULL THEN 'Current Record'
    ELSE CONCAT('Held for ', ROUND(EXTRACT(EPOCH FROM (held_until - broken_at)) / 86400), ' days')
  END as record_status
FROM record_history
WHERE event = '100 Fly'
  AND age_group = '9/10'
  AND gender = 'Female'
ORDER BY broken_at DESC;
```

**Example Output:**
```
swimmer_name     time      date        prev_holder    prev_time  improvement  status
Reagan S.        1:05.23   2025-03-15  Emily M.      1:06.12    0.89        Current Record
Emily M.         1:06.12   2025-02-10  Reagan S.     1:06.89    0.77        Held for 33 days
Reagan S.        1:06.89   2025-01-15  Emily M.      1:07.45    0.56        Held for 26 days
```

---

### Report 3: Season Summary (All Records Broken This Year)

```sql
SELECT 
  event,
  age_group,
  gender,
  COUNT(*) as times_broken,
  STRING_AGG(DISTINCT swimmer_name, ', ') as record_holders,
  MAX(improvement_seconds) as biggest_drop,
  SUM(improvement_seconds) as total_improvement
FROM record_history
WHERE EXTRACT(YEAR FROM date) = 2025
GROUP BY event, age_group, gender
ORDER BY total_improvement DESC;
```

**Example Output:**
```
event     age_group  gender  times_broken  record_holders           biggest_drop  total_improvement
100 Fly   9/10       Female  7            Reagan S., Emily M.       0.89         3.24
50 Free   11/12      Male    5            Preston J., Mason H.      0.67         2.15
```

---

### Report 4: Swimmers Who Broke Most Records

```sql
SELECT 
  swimmer_name,
  COUNT(*) as records_broken,
  COUNT(DISTINCT event) as different_events,
  SUM(improvement_seconds) as total_improvement,
  MIN(date) as first_record,
  MAX(date) as latest_record
FROM record_history
WHERE EXTRACT(YEAR FROM date) = 2025
GROUP BY swimmer_name
ORDER BY records_broken DESC
LIMIT 10;
```

**Example Output:**
```
swimmer_name        records_broken  different_events  total_improvement  first_record  latest_record
Reagan Strohhacker  12             8                15.67             2025-01-15    2025-03-15
Colin Eliason       8              5                10.23             2025-02-01    2025-03-10
```

---

### Report 5: Records That Stood The Longest

```sql
SELECT 
  event,
  age_group,
  gender,
  swimmer_name,
  time_display,
  broken_at,
  held_until,
  ROUND(EXTRACT(EPOCH FROM (held_until - broken_at)) / 86400) as days_held,
  previous_record_holder
FROM record_history
WHERE held_until IS NOT NULL
ORDER BY (held_until - broken_at) DESC
LIMIT 10;
```

---

### Report 6: Current Records (Most Recent for Each Event)

```sql
SELECT DISTINCT ON (event, age_group, gender)
  event,
  age_group,
  gender,
  swimmer_name,
  time_display,
  date,
  broken_at
FROM record_history
WHERE held_until IS NULL  -- Still current
ORDER BY event, age_group, gender, broken_at DESC;
```

---

### Report 7: Use the Built-in View

We created a view for easier querying:

```sql
SELECT * FROM record_progression
WHERE event = '50 Free'
  AND status = 'Current Record';
```

Or see all progressions:

```sql
SELECT * FROM record_progression
WHERE age_group = '11/12'
  AND gender = 'Female'
ORDER BY event, broken_at DESC;
```

---

## Setting Up

### Step 1: Create the Table

In Supabase SQL Editor:
```bash
Run: database/record_history_schema.sql
```

### Step 2: Deploy Code

```bash
git add .
git commit -m "Add record history tracking and deduplication"
git push
```

### Step 3: Test It

1. Upload results with record breaks
2. Confirm records in the modal
3. Check the tables:

```sql
-- Current records
SELECT * FROM team_records ORDER BY event, age_group;

-- Record history
SELECT * FROM record_history ORDER BY broken_at DESC LIMIT 20;
```

---

## Features

### Deduplication

If someone breaks the same record multiple times in one upload:
- ✅ System **automatically keeps only the fastest time**
- ✅ Console shows: `"Deduplicated: 8 → 5 (kept fastest times only)"`
- ✅ Only one modal entry per event/age/gender

Example:
```
Colin swims 100 Back twice:
- 49.81 (Prelim)
- 49.74 (Finals)

System shows: 49.74 only ✅
```

### Historical Tracking

Every record is logged:
```sql
SELECT 
  event,
  swimmer_name,
  time_display,
  improvement_seconds,
  broken_at
FROM record_history
WHERE swimmer_name = 'Colin A Eliason'
ORDER BY broken_at DESC;
```

---

## Report Ideas

You can now generate:

1. **Season Highlights**
   - "100 Fly 9/10 Girls record improved by 3.2 seconds across 7 breaks!"
   - "Reagan Strohhacker broke 12 team records this season!"

2. **Event Activity**
   - "Most competitive events: 100 Fly (7 breaks), 50 Free (5 breaks)"
   - "Records that haven't been broken in 5+ years"

3. **Swimmer Achievements**
   - "Colin Eliason currently holds 3 team records"
   - "Longest-held record: 200 Breast by Jane Doe (873 days)"

4. **Progression Charts**
   - Graph showing 100 Fly record dropping from 1:10 → 1:05 over season
   - Timeline of when each record was set

5. **Year-End Summary**
   - "2025 Season: 43 team records broken!"
   - "Total improvement: 87.3 seconds across all events"

---

## Future Enhancements

Possible additions:
- 📊 **Dashboard widget** showing recent record breaks
- 📧 **Email digest** of records broken each week
- 🏆 **Trophy Case** integration for record holders
- 📈 **Charts** showing record progression over time
- 📱 **Push notifications** when records are broken
- 🎯 **"Close to Record"** alerts (within 0.5s)
- 📸 **Photo gallery** of record-breaking swims

---

## Maintenance

### Backfilling Historical Data

If you want to add historical records from before this system:

```sql
INSERT INTO record_history (
  event, age_group, gender, swimmer_name,
  time_seconds, time_display, date, course,
  broken_at
)
VALUES
  ('50 Free', '11/12', 'Female', 'Reagan Strohhacker', 24.91, '24.91', '2024-04-03', 'SCY', '2024-04-03'),
  -- ... more records
  ;
```

### Fixing Incorrect History

```sql
-- Delete incorrect entry
DELETE FROM record_history WHERE id = 'uuid-here';

-- Update entry
UPDATE record_history 
SET swimmer_name = 'Correct Name',
    time_seconds = 49.74
WHERE id = 'uuid-here';
```

---

## Summary

✅ **Automatic Tracking** - Every record break is logged  
✅ **Deduplication** - Only fastest time kept per event  
✅ **Rich History** - Full progression tracking  
✅ **Easy Querying** - Built-in view and example queries  
✅ **Report Ready** - Generate any stats you need  

Now you can tell the story of how your team's records evolved! 📈🏊‍♀️

