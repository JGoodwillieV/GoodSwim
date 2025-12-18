# Category Progress Report (Meet Results) - Documentation

## Overview

The **Category Progress Report** analyzes meet results (actual competition times) by stroke category, showing how swimmers improve over time in Freestyle, Backstroke, Breaststroke, Butterfly, and Individual Medley.

## What's Different from Test Set Progress?

| Feature | Category Progress (Meet Results) | Test Set Progress (Practice) |
|---------|----------------------------------|------------------------------|
| **Data Source** | `results` table (meet times) | `test_sets` table (practice times) |
| **Purpose** | Track competition performance | Track practice performance |
| **Location** | Dashboard Widget + Reports | Reports only |
| **Time Range** | Season/3mo/6mo/Year | All time |
| **Grouping** | Weekly averages | Individual test sets |

## Features

### 📊 Dashboard Widget
- **Location**: Dashboard, above "Practice Test Sets"
- **Shows**: Last 60 days of meet results
- **Data**: Weekly averages by stroke
- **Quick Stats**: Improvement percentages for each stroke
- **Action**: Click "View Report" for full analysis

### 📈 Full Report
- **Location**: Reports section → "Category Progress" card
- **Features**:
  - Interactive line chart with all 5 competitive strokes
  - Toggle between "Pace per 100" (normalized) and "Raw Average"
  - Time range selector (Season / 3 months / 6 months / Year)
  - Summary cards showing swim counts and improvement
  - Expandable stroke sections with recent meet results
  - Individual swim details with dates and swimmers

## How It Works

### Data Collection
1. **Fetches meet results** from the `results` table
2. **Parses event names** to extract distance and stroke
3. **Filters to competitive strokes** (free, back, breast, fly, IM)
4. **Groups by time period** (weekly for chart display)

### Calculations

#### Pace Normalization (Default)
Allows fair comparison across different distances:

```
Pace per 100 = (Time in Seconds / Distance) × 100
```

**Example**:
- 50 Free in 24.5s → 49.0s per 100
- 100 Free in 55.2s → 55.2s per 100
- 200 Free in 2:04.8 (124.8s) → 62.4s per 100

#### Weekly Averages
- Groups all swims in the same week (Sunday-Saturday)
- Calculates average pace for that week
- Smooths out day-to-day variations
- Shows overall trends

#### Improvement Calculation
```
Improvement % = ((First Week Average - Last Week Average) / First Week Average) × 100
```

### Time Range Options

#### Current Season (Default)
- **Period**: Sept 1 to Aug 31
- **Use Case**: Track full swim season progress
- **Example**: If it's March 2025, shows Sept 2024 - present

#### Last 3 Months
- **Period**: Rolling 3-month window
- **Use Case**: Recent performance trends
- **Example**: Focus on mid-season improvement

#### Last 6 Months
- **Period**: Rolling 6-month window
- **Use Case**: Long-term trends
- **Example**: Compare fall vs spring

#### Last Year
- **Period**: Rolling 12-month window
- **Use Case**: Year-over-year comparison
- **Example**: Full annual performance

## Visual Indicators

### Chart
- **📉 Lines trending down** = Times improving (swimmers getting faster)
- **📈 Lines trending up** = Times regressing (needs attention)
- **Color-coded strokes** for easy identification

### Summary Cards
- **Number = Swim count** for that stroke
- **↓ Green % = Improvement** (faster times)
- **↑ Red % = Regression** (slower times)

### Stroke Colors
- 🔵 **Freestyle**: Blue
- 🟣 **Backstroke**: Purple
- 🟢 **Breaststroke**: Emerald
- 🟡 **Butterfly**: Amber
- 🔴 **Individual Medley**: Pink

## Database Schema

### Results Table (Source Data)
```sql
results:
  - swimmer_id: UUID
  - event: VARCHAR (e.g., "50 Free", "100 Back")
  - time: VARCHAR (e.g., "24.50Y", "1:05.23Y")
  - date: DATE
  - swimmers: (joined) { id, name, group_name }
```

**No database changes required!** Uses existing meet results.

## Usage Guide

### For Coaches

#### View Quick Status (Dashboard Widget)
1. Open Dashboard
2. Look at "Category Progress" widget
3. See recent trends and improvement percentages
4. Click "View Report" for details

#### Analyze Full Season (Full Report)
1. Go to Reports → Category Progress
2. Select time range (default: Current Season)
3. Review the line chart for trends
4. Click on stroke cards to see individual swims
5. Use findings to adjust training focus

#### Compare Time Periods
1. Open Category Progress Report
2. Try different time ranges:
   - **Current Season**: Full season progress
   - **Last 3 Months**: Recent improvement
   - **Last 6 Months**: Long-term trends
3. Screenshot charts for team meetings

### For Parents

#### View Team Performance
1. Reports → Category Progress
2. See which strokes are improving fastest
3. Understand overall team trends
4. Note: Individual results shown in expandable sections

### For Swimmers

#### Track Personal Progress
1. Navigate to Category Progress
2. Expand your stroke categories
3. See your recent meet results
4. Compare to team averages

## Example Scenarios

### Scenario 1: Mid-Season Check
**Goal**: See if training is working

**Steps**:
1. Open Category Progress (Dashboard widget)
2. All strokes show ↓ (improvement) - Great!
3. Click "View Report" for details
4. Fly shows +2.3% regression - needs focus

**Action**: Adjust practice to include more butterfly drills

### Scenario 2: Championship Prep
**Goal**: Identify strengths to maximize scoring

**Steps**:
1. Reports → Category Progress
2. Set time range to "Last 3 Months"
3. See Freestyle ↓4.5% (biggest improvement)
4. See Breaststroke ↓1.2% (slowest improvement)

**Action**: Enter more freestyle events at champs

### Scenario 3: Parent Communication
**Goal**: Show season progress to parents

**Steps**:
1. Open Category Progress Report
2. Set time range to "Current Season"
3. Take screenshot of chart showing downward trends
4. Share at parent meeting: "All strokes improved 2-5%!"

### Scenario 4: Individual Swimmer Review
**Goal**: Review swimmer's meet performance

**Steps**:
1. Open Category Progress Report
2. Expand stroke category (e.g., Freestyle)
3. Look at recent swims
4. See dates, times, and improvements
5. Use for goal-setting conversations

## Tips & Best Practices

### 🎯 For Best Results

1. **Regular Meet Entries**: Enter meet results promptly after each meet
2. **Consistent Event Selection**: Have swimmers compete in variety of strokes
3. **Review Weekly**: Check dashboard widget each Monday
4. **Monthly Deep Dive**: Open full report monthly for trends
5. **Season Comparison**: Use time ranges to compare periods

### 📊 Interpreting Data

**Good Signs**:
- All strokes trending downward (improving)
- Consistent improvement percentages (2-5%)
- No sudden spikes upward

**Warning Signs**:
- Stroke trending upward (getting slower)
- Flat lines (no improvement)
- Wide week-to-week variation

**Context Matters**:
- **Taper periods**: Times should drop significantly
- **Training periods**: Times may be slower (training through)
- **Season start**: Expect higher (slower) times

### 🔍 Troubleshooting

#### No Data Showing
**Problem**: Widget or report shows "No meet data yet"

**Solutions**:
1. Ensure meet results have been entered in the system
2. Check that results table has data with valid dates
3. Verify event names are parseable (e.g., "50 Free", not just "Free")
4. Try different time ranges

#### Chart Looks Jagged
**Problem**: Line chart has large spikes

**Causes**:
1. Mix of distances (solution: use "Pace per 100" mode)
2. Different swimmer levels in different meets
3. Sparse data (only 1-2 meets)

**Solutions**:
- Ensure "Pace per 100" toggle is ON
- Need more meets for smoother trends
- Consider adjusting time range

#### Wrong Improvement Values
**Problem**: Percentages seem incorrect

**Solutions**:
1. Verify "Pace per 100" mode is active
2. Check that meet results have correct dates
3. Ensure times are properly formatted (e.g., "24.50Y")
4. Look at time range - may be comparing wrong periods

#### Stroke Not Showing
**Problem**: Certain stroke missing from report

**Causes**:
- No meet results for that stroke in selected time range
- Event names not parsed correctly
- Results filtered out (invalid times)

**Solutions**:
1. Expand time range
2. Check event name format in results table
3. Verify times are valid (not "DQ", "NS", etc.)

## Navigation

### Access Points

**From Dashboard**:
```
Dashboard 
  → Category Progress Widget 
  → Click "View Report"
  → Full Report
```

**From Reports Menu**:
```
Sidebar → Reports 
  → Reports Menu
  → Click "Category Progress" (cyan card)
  → Full Report
```

**Back Navigation**:
- Full Report → Click Back → Returns to Dashboard or Reports

### Related Features

- **Test Set Progress**: Similar report for practice test sets (Reports only)
- **Big Movers**: Leaderboard of biggest time drops
- **Meet Report**: Comprehensive post-meet analysis
- **Top Times**: Best times by event and date range

## Technical Details

### Performance
- **Efficient queries**: Single query with date filtering
- **Smart grouping**: Weekly averages reduce data points
- **Memoized calculations**: React hooks optimize rendering
- **Responsive charts**: Recharts library for smooth visualization

### Data Flow
```
results table 
  → Parse event names
  → Filter to competitive strokes
  → Group by week
  → Calculate averages
  → Chart display
```

### Edge Cases Handled
- **Mixed courses** (SCY/LCM/SCM): All treated equally (may want to filter)
- **Invalid times**: Filtered out (DQ, NS, times > 999999s)
- **Missing distances**: Events without parseable distance excluded
- **Sparse data**: Connect nulls in chart for continuous lines

## Comparison to Test Set Progress

Both reports track stroke progress, but serve different purposes:

### Use Category Progress (Meet Results) When:
- ✅ Analyzing competition performance
- ✅ Preparing for championship meets
- ✅ Communicating with parents about meet results
- ✅ Setting competition-based goals
- ✅ Comparing to time standards

### Use Test Set Progress (Practice) When:
- ✅ Monitoring daily training progress
- ✅ Adjusting practice plans
- ✅ Tracking specific test set protocols
- ✅ Evaluating training effectiveness
- ✅ Comparing practice performance

## Future Enhancements (Optional)

Potential improvements for future iterations:

1. **Course Filtering**
   - Separate SCY, SCM, LCM
   - Convert times between courses

2. **Swimmer Filtering**
   - Filter by training group
   - Filter by age group
   - Individual swimmer view

3. **Goal Setting**
   - Set target paces
   - Show goal lines on chart
   - Alert when goals met

4. **Meet Comparison**
   - Compare specific meets
   - Before/after meet analysis
   - Peak performance identification

5. **Export Options**
   - PDF report generation
   - CSV data export
   - Share charts via email

## Summary

The Category Progress Report provides powerful insights into meet performance trends by stroke category. With both a quick dashboard widget and comprehensive full report, coaches can:

- ✅ Track competition performance across all strokes
- ✅ Identify which strokes need more focus
- ✅ Monitor improvement throughout the season
- ✅ Make data-driven decisions about meet entries
- ✅ Communicate progress to swimmers and parents

**Status**: ✅ Complete and Ready to Use

**Last Updated**: December 17, 2025

