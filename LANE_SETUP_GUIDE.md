# Test Set Lane Setup Guide

## Overview

The lane-based test set feature allows coaches to organize multiple swimmers per lane with staggered starts, making it easy to track times when swimmers leave at intervals (e.g., 5 seconds apart).

## Quick Start

### 1. Database Setup

First, run the migration to add lane support to your database:

```sql
-- In Supabase SQL Editor, run:
-- database/test_sets_lane_migration.sql
```

Go to your Supabase project:
1. Open **SQL Editor**
2. Copy and paste the contents of `database/test_sets_lane_migration.sql`
3. Click **Run**
4. You should see "Success. No rows returned" ✅

### 2. Creating a Lane-Based Test Set

#### Step 1: Select Group & Swimmers
1. Open StormTracker and click **"New Test Set"**
2. Select your group (e.g., "Senior Group")
3. Select all swimmers participating in the set
4. Configure the set details (distance, stroke, reps, etc.)

#### Step 2: Enable Lane Setup
1. Toggle **"Lane Setup"** ON
2. Set the **Stagger Interval** (default: 5 seconds)
   - This is how many seconds apart swimmers leave in the same lane
   - Example: 5 seconds means 2nd swimmer leaves 5s after 1st, 3rd leaves 10s after 1st

#### Step 3: Organize Swimmers into Lanes
**Quick Setup** (recommended):
- Tap **"2 Lanes"**, **"3 Lanes"**, **"4 Lanes"**, or **"6 Lanes"**
- Swimmers are automatically distributed evenly across lanes

**Manual Organization**:
- Each lane shows swimmers in order
- Use ⬆️ ⬇️ arrows to reorder within a lane
- Use ❌ to remove a swimmer from a lane
- Add unassigned swimmers using the **"Add"** button

#### Step 4: Verify Setup
- Check each lane has the correct swimmers
- Verify the order within each lane
- Confirm the stagger interval is correct

### 3. Running the Test Set

#### On the Timing Screen
- **Lane-based view**: Swimmers are organized by lane
- **Position indicator**: Small badge (1, 2, 3...) shows order within lane
- **Start offset**: Shows "+0s", "+5s", "+10s" etc. for stagger
- **Individual timers**: Each swimmer's timer starts at their scheduled time

#### Timing Process
1. Click **START** when the first swimmers begin
2. Timers automatically account for staggered starts
3. Tap each swimmer's card when they finish
4. The time recorded is their actual swim time (not including wait time)

#### During the Set
- **"Wait..."** appears for swimmers who haven't started yet
- Once a swimmer's start time arrives, their timer begins
- Tap their card when they touch the wall
- Use **"Next Rep"** to advance to the next repetition

### 4. iPad Optimization

The lane-based layout is designed for iPad use:
- **Landscape mode**: Best for viewing multiple lanes
- **Large touch targets**: Easy to tap while poolside
- **Clear organization**: See all lanes at a glance
- **Visual feedback**: Color-coded by completion status

### 5. Viewing Results

After completing the set:
- Results show average and best times per swimmer
- Times are accurately calculated based on each swimmer's actual start
- Lane information is preserved in the database
- Historical data can track progress over time

## Example Scenario

**Setup**: 12 swimmers, 4 lanes, 5-second stagger, 10x100 Free

**Lane 1**: Alice (0s), Bob (+5s), Carol (+10s)  
**Lane 2**: Dave (0s), Emma (+5s), Frank (+10s)  
**Lane 3**: Grace (0s), Henry (+5s), Iris (+10s)  
**Lane 4**: Jack (0s), Kate (+5s), Leo (+10s)

**Timing**:
1. Coach hits START
2. Alice, Dave, Grace, Jack start immediately (their timers begin)
3. 5 seconds later: Bob, Emma, Henry, Kate's timers begin
4. 10 seconds later: Carol, Frank, Iris, Leo's timers begin
5. As each swimmer finishes, coach taps their card
6. Recorded time = actual swim time (stagger offset automatically applied)

## Benefits

✅ **Accurate Times** - Each swimmer's time is tracked from their individual start  
✅ **Easy Organization** - Visual lane setup makes poolside setup quick  
✅ **Multiple Swimmers** - Handle 3-4 swimmers per lane efficiently  
✅ **iPad Friendly** - Large, clear interface perfect for touchscreens  
✅ **Flexible Configuration** - Adjust stagger intervals based on ability level  
✅ **Historical Tracking** - Lane data saved for future reference  

## Tips for Coaches

1. **Consistent Stagger**: Use the same interval throughout practice
2. **Ability Grouping**: Put similar-speed swimmers in the same lane
3. **Test First**: Do a practice rep to verify timing works correctly
4. **Visual Cues**: Watch the position badges (1, 2, 3) to know who started when
5. **Backup Plan**: If a swimmer misses their start, you can still tap when they finish

## Troubleshooting

**Problem**: Swimmers in wrong order  
**Solution**: Use up/down arrows in setup to reorder before starting

**Problem**: Wrong stagger interval  
**Solution**: Adjust the interval in setup before clicking START

**Problem**: Swimmer missed their start  
**Solution**: Still tap when they finish - time will be from their scheduled start

**Problem**: Need to add a lane  
**Solution**: Use the Quick Setup buttons to redistribute swimmers

## Support

For questions or issues, check:
- This guide
- The main StormTracker documentation
- Browser console (F12) for technical errors

Happy timing! 🏊‍♀️🏊‍♂️

