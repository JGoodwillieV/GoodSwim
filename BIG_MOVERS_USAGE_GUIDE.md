# Big Movers Report - Quick Start Guide

## Accessing the Report

1. Navigate to the **Dashboard**
2. Click on **"Team Reports"** quick action (purple card with file icon)
3. Select **"Big Movers"** from the reports menu
   - Icon: 📈 (Green trending up arrow)
   - Description: "Leaderboard of total time dropped this season"

## Basic Usage

### Step 1: Set Your Filters

**Time Period** (First dropdown)
- Season to Date ← Default (starts Sep 1)
- Last 30 Days
- Last 60 Days
- Last 90 Days
- Custom Range (shows date pickers)

**Gender**
- All ← Default
- Boys
- Girls

**Age Group**
- All Ages ← Default
- 10 & Under
- 11-12
- 13-14
- 15-18

**Training Group**
- All Groups ← Default
- [Your team's training groups]

**Stroke**
- All Strokes ← Default
- Freestyle
- Backstroke
- Breaststroke
- Butterfly
- IM

### Step 2: Generate the Report

Click the green **"Generate Report"** button (with lightning bolt icon)

**What happens:**
- System loads all results in the selected time period
- Loads historical results for comparison
- Calculates time drops, best times, and standards
- Processes all swimmers matching your filters
- Displays results in ~5-15 seconds (depending on data size)

### Step 3: View the Results

#### Stats Dashboard (Top)
6 colorful cards showing:
- 👥 Total swimmers with improvements
- ⬇️ Total time dropped (green gradient)
- 📊 Average drop per swimmer (blue)
- 🏆 Total best times (purple)
- ⭐ Total new standards (yellow)
- 🔥 Biggest single drop (orange)

#### View Tabs (Below stats)
Click to change sorting:
- **Total Time Dropped** (Green) - Default view
- **% Improvement** (Blue) - Shows percentage drops
- **Most Best Times** (Purple) - Sorted by BT count
- **Standards Achieved** (Yellow) - New standards count

#### Podium Display (Middle)
Visual podium showing top 3 swimmers:
- **1st Place** (Gold) - Taller pedestal in center
- **2nd Place** (Silver) - Left side
- **3rd Place** (Bronze) - Right side

Each shows:
- Avatar with initials
- Name, age, and training group
- Primary metric (based on active view)
- Events improved and best times count

#### Full Leaderboard (Bottom)
List of all swimmers ranked:
- **Rank number** on left
- **Avatar** with initials
- **Name, age, gender, group**
- **4 key metrics** displayed horizontally
- **Primary value** (large, right side)
- **Expand arrow** to see details

### Step 4: Explore Swimmer Details

Click on any swimmer row to expand and see:

**Best Single Drop**
- Green box showing their biggest improvement
- Event name and seconds dropped

**Event Improvements** (Top 3)
- Grid showing old time → new time
- Seconds and percentage dropped

**New Standards Achieved** (If any)
- Yellow badges showing standard level (B, BB, A, AA, etc.)
- Event and time achieved

### Step 5: Compare Training Groups (Optional)

If you have multiple training groups:

1. Click **"Group Comparison"** button (top right, cyan)
2. View side-by-side comparison cards showing:
   - Swimmer count per group
   - Average time drop
   - Average percentage drop
   - Total best times
   - Total new standards
3. **Top group highlighted** in green with "TOP" badge

### Step 6: Export to PDF

When you're happy with the report:

1. Click blue **"Export PDF"** button (top right)
2. New window opens with formatted report
3. Click **"Print PDF"** button
4. Select "Save as PDF" in print dialog
5. Choose location and save

**PDF includes:**
- Report header with date
- All active filters shown
- Stats summary with colors
- Top 3 podium visualization
- Top 10 leaderboard with full details
- Group comparison (if applicable)

## Tips & Tricks

### Finding Specific Swimmers
- Use training group filter to focus on your squad
- Use stroke filter to see stroke-specific improvers
- Use age group filter for age-group recognition

### Season Review
1. Set to "Season to Date"
2. Leave all other filters at "All"
3. Generate report
4. Export PDF for awards night

### Monthly Recognition
1. Set to "Last 30 Days"
2. Generate at end of each month
3. Share top 3 at team meeting
4. Post podium on social media

### Championship Prep
1. Set to "Last 90 Days"
2. Filter by age group (e.g., 13-14)
3. Filter by gender
4. See who's peaking at the right time

### Stroke-Specific Analysis
1. Filter by single stroke (e.g., Backstroke)
2. See "Who's improving most in back?"
3. Useful for technique focus weeks

### Comparing Boys vs Girls
1. Run report for Boys
2. Export PDF
3. Change filter to Girls
4. Generate again
5. Compare top performers

## Understanding the Metrics

### Total Time Dropped
**What it is:** Sum of all time improvements
- Example: 50 Free dropped 2.5s, 100 Free dropped 3.0s = 5.5s total
- Best for: Overall season progress

### Percentage Improvement
**What it is:** Average % improvement across all events
- Example: 50 Free 5% faster, 100 Free 3% faster = 4% avg
- Best for: Comparing across age groups

### Most Best Times
**What it is:** Count of best times achieved
- Includes first-time events
- Includes improvements over historical bests
- Best for: Motivation and trying new events

### Standards Achieved
**What it is:** Count of NEW motivational standards
- Only counts standards not previously held
- Examples: B Time, BB Time, A Time, AA Time
- Best for: Qualification tracking

## Common Scenarios

### "No swimmers found"
- Widen your filters (change to "All")
- Check time period (might be too narrow)
- Verify swimmers have results in database

### "Only showing 3 swimmers"
- This is normal if only 3 have improvements
- Check if other swimmers swam during period
- Verify time period covers meets

### "Standards not showing"
- Standards must be newly achieved in period
- Historical achievements don't count
- Check if standards are loaded in database

### "Group comparison not appearing"
- Requires multiple training groups
- Check that swimmers have group_name set
- Will auto-appear if 2+ groups exist

## Best Practices

✅ **DO:**
- Run monthly for consistent recognition
- Use PDF export for official records
- Share podium with parents/social media
- Celebrate all improvement levels
- Use filters to ensure fair comparison

❌ **DON'T:**
- Compare swimmers across very different ages without filters
- Focus only on top 3 (scroll down to see everyone!)
- Forget about percentage view (great equalizer)
- Ignore new standards achievements

## Questions?

**Q: Why isn't my swimmer showing up?**
A: Check that they have results in the selected time period AND historical results to compare against.

**Q: What counts as a "best time"?**
A: Either a first-time swim of an event OR faster than ANY previous time (not just most recent).

**Q: Can I see improvement in a single stroke?**
A: Yes! Use the "Stroke" filter to focus on Free, Back, Breast, Fly, or IM only.

**Q: How far back does "Season to Date" go?**
A: Starts September 1st of the current swim year (Sept-Aug season).

**Q: Can parents see this?**
A: Currently coach-only. Consider exporting PDF and sharing specific sections.

**Q: What if someone got slower?**
A: They won't appear in the report. This focuses on improvements only.

---

**Need more details?** See `BIG_MOVERS_FEATURE.md` for technical documentation.

