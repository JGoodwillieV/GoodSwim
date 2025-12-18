# Team Records Setup Guide

This guide explains how to set up and use the Hurricane SC team records feature in StormTracker.

## Overview

The team records feature allows swimmers to see how their personal bests compare to the team's all-time records for their age group. Team records appear in the "View Ladder" section of the Standards & Goals display on each swimmer's profile.

## Setup Steps

### 1. Create the Database Table

First, you need to create the `team_records` table in your Supabase database:

1. Log in to your Supabase project at https://supabase.com
2. Navigate to the SQL Editor
3. Copy the contents of `database/team_records_schema.sql`
4. Paste it into the SQL Editor and click "Run"

This will create:
- The `team_records` table with all necessary columns
- Indexes for efficient querying
- Row Level Security (RLS) policies

### 2. Load the Team Records Data

After creating the table, load the Hurricane SC records data:

**Option A: Using the Node.js script (Recommended)**

```bash
# Make sure you're in the project root directory
cd StormTracker

# Run the load script
node database/load_team_records.js
```

The script will:
- Read all records from `team_records_data.json`
- Insert them into the Supabase database in batches
- Verify the data was loaded correctly

**Option B: Manual Import via Supabase**

1. Go to your Supabase project > Table Editor
2. Select the `team_records` table
3. Click "Insert" > "Insert rows from CSV/JSON"
4. Upload the `team_records_data.json` file

### 3. Verify the Setup

To verify everything is working:

1. Open StormTracker in your browser
2. Navigate to a swimmer's profile
3. Find an event where the swimmer has a time
4. Look at the "Standards & Goals" section
5. Click "View Ladder"
6. You should see:
   - Official time standards (B, BB, A, AA, AAA, AAAA)
   - **Team Record** (highlighted in gold/orange)
   - The swimmer's best time (highlighted in blue)

## Data Structure

### Team Records Table Schema

```sql
- id: UUID (Primary Key)
- event: VARCHAR(100) - e.g., "50 Free", "100 Back", "200 IM"
- age_group: VARCHAR(20) - "8 & Under", "9/10", "11/12", "13/14", "15 & Over"
- gender: VARCHAR(10) - "Male" or "Female"
- swimmer_name: VARCHAR(100) - Name of the record holder
- time_seconds: DECIMAL(10,2) - Time in seconds (for sorting/comparison)
- time_display: VARCHAR(20) - Formatted time string (e.g., "24.91" or "1:18.18")
- date: DATE - Date the record was set
- course: VARCHAR(10) - "SCY" (Short Course Yards), "SCM", or "LCM"
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Age Group Mapping

The system automatically maps swimmer ages to team record age groups:

- Age ≤ 8 → "8 & Under"
- Age 9-10 → "9/10"
- Age 11-12 → "11/12"
- Age 13-14 → "13/14"
- Age ≥ 15 → "15 & Over"

## Updating Team Records

When a new team record is set:

### Option 1: Update via Supabase Dashboard

1. Go to Supabase > Table Editor > `team_records`
2. Find the record for that event/age group/gender
3. Update the fields:
   - `swimmer_name`
   - `time_seconds`
   - `time_display`
   - `date`

### Option 2: Update the JSON file and reload

1. Edit `database/team_records_data.json`
2. Update the relevant record
3. Delete existing records from the `team_records` table in Supabase
4. Run `node database/load_team_records.js` again

### Option 3: Add a new record programmatically

You can also add records via the Supabase JavaScript client:

```javascript
const { data, error } = await supabase
  .from('team_records')
  .insert({
    event: '50 Free',
    age_group: '11/12',
    gender: 'Female',
    swimmer_name: 'Jane Doe',
    time_seconds: 24.50,
    time_display: '24.50',
    date: '2025-03-20',
    course: 'SCY'
  });
```

## Features

### In the Standards & Goals Display

- **Team Record Badge**: Team records appear with a gold/orange gradient background
- **Star Icon**: Distinguished with a star icon instead of a rank number
- **Record Holder Name**: Shows who holds the record in parentheses
- **Contextual Display**: Only shows records for the swimmer's current age group and gender

### Visual Hierarchy

In the "View Ladder" modal, times are displayed in this order (fastest to slowest):
1. Official time standards (B through AAAA)
2. Team record (gold/orange with star icon)
3. Swimmer's best time (blue with clock icon)

All items are sorted by time, so you can easily see where the swimmer ranks compared to both official standards and team history.

## Troubleshooting

### Team records not appearing

1. **Check database**: Verify records exist in Supabase
   ```sql
   SELECT * FROM team_records LIMIT 10;
   ```

2. **Check RLS policies**: Ensure the "viewable by everyone" policy is enabled

3. **Check console**: Open browser DevTools and look for any error messages

4. **Verify event name match**: The event name in results must exactly match the event name in team_records (e.g., "50 Free" not "50 Freestyle")

### Data not loading

1. Make sure you ran the schema SQL first
2. Check that the Supabase URL and key in `supabase.js` are correct
3. Verify your internet connection
4. Check the Supabase project logs for any errors

## Data Sources

The team records in `team_records_data.json` were sourced from the Hurricane SC records PDF document dated December 2024 - March 2025. Records include:

- All standard individual events (Free, Back, Breast, Fly, IM)
- Distances from 25y to 1650y
- All age groups (8 & Under through 15 & Over)
- Both male and female divisions
- Short Course Yards (SCY) only

Relay records are not currently included but can be added to the system following the same structure.

## Future Enhancements

Possible additions to this feature:
- Relay records support
- Long Course (LCM) and Short Course Meters (SCM) records
- Historical record progression (track previous record holders)
- "Approaching Record" notifications when swimmers get within a certain time
- Team record dashboard showing all current records
- Record-breaking celebration UI when a swimmer breaks a team record

## Support

If you encounter any issues with the team records feature, please check:
1. This README file
2. The Supabase project logs
3. Browser console for error messages
4. Verify the table schema matches the SQL file

For additional help, contact the StormTracker development team.

