# Lane-Based Test Set Feature - Implementation Summary

## Overview

This feature enhancement adds support for lane-based test sets with staggered starts, allowing coaches to efficiently track multiple swimmers per lane who leave at set intervals (e.g., 5 seconds apart).

## Problem Solved

**Before**: All swimmers in a test set had the same start time, making it difficult to:
- Track multiple swimmers per lane
- Handle staggered starts common in practice
- Organize large groups efficiently

**After**: Coaches can:
- Organize swimmers into lanes
- Set custom stagger intervals (e.g., 5 seconds)
- Track each swimmer's individual time accurately
- View results organized by lane

## Technical Implementation

### 1. Database Changes

**New Columns in `test_sets` table:**
- `use_lanes` (BOOLEAN) - Whether this set uses lane organization
- `lane_stagger_seconds` (INTEGER) - Seconds between swimmer starts in same lane

**New Columns in `test_set_results` table:**
- `lane_number` (INTEGER) - Which lane the swimmer was in
- `lane_position` (INTEGER) - Position within lane (0 = first, 1 = second, etc.)
- `start_offset_ms` (INTEGER) - Milliseconds offset from rep start time

**Migration File:** `database/test_sets_lane_migration.sql`

### 2. Frontend Changes

#### TestSetTracker.jsx
**New State Variables:**
```javascript
- useLanes: boolean - Toggle for lane mode
- laneConfig: object - { laneNumber: [swimmer1, swimmer2, ...] }
- laneStagger: number - Seconds between swimmers in same lane
- swimmerStartTimes: object - { swimmerId: { rep: startTimeMs } }
```

**New Functions:**
- `autoDistributeLanes(numLanes)` - Evenly distribute swimmers across lanes
- `moveSwimmerToLane(swimmer, fromLane, toLane, toPosition)` - Move swimmers between lanes
- `removeSwimmerFromLane(swimmer, laneNum)` - Remove swimmer from lane
- `moveSwimmerInLane(laneNum, fromIndex, toIndex)` - Reorder within lane
- `getSwimmersInLanes()` - Get all swimmers currently assigned to lanes
- `getUnassignedSwimmers()` - Get swimmers not yet in a lane

**Updated Functions:**
- `handleStart()` - Sets individual start times based on lane position
- `advanceRep()` - Sets start times for next rep with stagger
- `handleSwimmerTap()` - Calculates time from swimmer's individual start
- `handleSave()` - Saves lane configuration and position data

**UI Enhancements:**

*Setup Screen:*
- Lane Setup toggle with stagger interval configuration
- Quick setup buttons (2, 3, 4, 6 lanes)
- Visual lane organization with drag/drop
- Position badges showing order within lane
- Start offset preview (+0s, +5s, +10s)
- Unassigned swimmers warning section

*Timing Screen:*
- Lane-based layout (replaces flat grid when lanes enabled)
- Swimmers organized by lane with headers
- Position indicators (1, 2, 3) showing order
- Individual countdown timers per swimmer
- "Wait..." indicator before swimmer's start time
- Start offset labels (+5s, +10s, etc.)
- Per-lane completion tracking

#### TestSetDisplay.jsx
**Updated Queries:**
- Include `lane_number`, `lane_position`, `start_offset_ms` in all result queries

**Visual Indicators:**
- "Lanes" badge on lane-based test sets in recent list
- Lane info header showing stagger interval
- Lane/Position column in expanded results (L3 #2 = Lane 3, Position 2)

### 3. Documentation

**Created Files:**
- `LANE_SETUP_GUIDE.md` - Comprehensive coach guide
- `LANE_FEATURE_SUMMARY.md` - This technical summary
- `database/test_sets_lane_migration.sql` - Database migration

## User Experience Flow

### Setup Phase
1. Coach creates new test set
2. Selects group and swimmers
3. Enables "Lane Setup" toggle
4. Sets stagger interval (default: 5 seconds)
5. Quick-distributes swimmers or manually organizes
6. Verifies configuration and starts

### Timing Phase
1. Coach hits START
2. First swimmers in each lane start immediately
3. Subsequent swimmers' timers start at their offset time
4. Coach taps each swimmer when they finish
5. Time recorded is accurate swim time (offset handled automatically)
6. Advances to next rep, stagger pattern repeats

### Results Phase
1. Results show accurate times per swimmer
2. Lane information preserved
3. Visual indicators show lane/position
4. Historical data queryable by lane

## iPad Optimization

**Design Considerations:**
- Large touch targets for poolside use
- Clear lane separation with visual hierarchy
- Color-coded status (waiting, swimming, finished)
- Landscape orientation optimized
- Minimal scrolling needed
- High contrast for outdoor visibility

**Layout:**
- Lane headers with completion counters
- 2-4 swimmers per row depending on screen size
- Position badges clearly visible
- Touch-friendly button spacing

## Example Use Case

**Scenario:** 12 swimmers, 10x100 Freestyle, 4 lanes, 5-second stagger

**Lane 1:** Alice (0s), Bob (+5s), Carol (+10s)
**Lane 2:** Dave (0s), Emma (+5s), Frank (+10s)  
**Lane 3:** Grace (0s), Henry (+5s), Iris (+10s)
**Lane 4:** Jack (0s), Kate (+5s), Leo (+10s)

**Timing:**
- 0:00 - Coach hits START, Alice/Dave/Grace/Jack start
- 0:05 - Bob/Emma/Henry/Kate timers begin
- 0:10 - Carol/Frank/Iris/Leo timers begin
- As each finishes, coach taps their card
- All times accurately reflect individual swim duration

## Benefits

### For Coaches
✅ Organize large groups efficiently  
✅ Track multiple swimmers per lane  
✅ Accurate timing with automatic offset calculation  
✅ iPad-friendly interface  
✅ Flexible configuration (2-6 lanes, custom stagger)  
✅ Visual feedback on completion status  

### For Swimmers
✅ Fair timing regardless of lane position  
✅ Clear organization reduces confusion  
✅ Consistent intervals = consistent practice  

### For Program
✅ More swimmers can practice simultaneously  
✅ Better data collection for analysis  
✅ Professional timing system  
✅ Historical lane data preserved  

## Backward Compatibility

- Existing test sets without lanes continue to work normally
- `use_lanes = false` or `NULL` triggers standard grid layout
- No data migration needed for existing test_set_results
- New columns have sensible defaults (NULL or 0)

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Create test set with 2 lanes, 2 swimmers each
- [ ] Verify stagger interval adjusts correctly
- [ ] Test auto-distribution (2, 3, 4, 6 lanes)
- [ ] Test manual lane organization
- [ ] Test reordering within lanes
- [ ] Verify timing screen shows lanes correctly
- [ ] Test swimmer tap timing accuracy
- [ ] Verify "Wait..." appears before start time
- [ ] Test advancing to next rep
- [ ] Verify results save with lane data
- [ ] Check historical results show lane info
- [ ] Test on iPad in landscape mode
- [ ] Test on iPhone (should still be usable)
- [ ] Verify backward compatibility with old test sets

## Future Enhancements (Optional)

1. **Templates**: Save lane configurations as templates
2. **Drag & Drop**: Drag swimmers between lanes during setup
3. **Auto-Stagger Calculation**: Suggest stagger based on swimmer ability
4. **Lane Colors**: Color-code lanes for easier visual tracking
5. **Split Times**: Track intermediate times at 50m marks
6. **Voice Announcements**: Audio cues for swimmer starts
7. **Apple Watch Integration**: Tap watch instead of iPad

## Performance Considerations

- Lane configuration stored in state (not re-calculated)
- Start times calculated once per rep
- Efficient rendering with React keys
- Minimal re-renders during timing
- Database indexes on lane columns for fast queries

## Accessibility

- High contrast colors for outdoor use
- Large touch targets (44x44 minimum)
- Clear visual hierarchy
- Status indicators (color + icon + text)
- Responsive layout for different screen sizes

## Support & Maintenance

**Common Issues:**
1. Stagger too short - increase interval in setup
2. Swimmer in wrong lane - reorganize before starting
3. Missed start - still tap when finished, time calculated from scheduled start

**Database Queries:**
```sql
-- Find all lane-based test sets
SELECT * FROM test_sets WHERE use_lanes = true;

-- Get results by lane
SELECT * FROM test_set_results 
WHERE test_set_id = 'xxx' 
ORDER BY lane_number, lane_position;

-- Average times by lane position
SELECT lane_position, AVG(time_ms) 
FROM test_set_results 
WHERE test_set_id = 'xxx' 
GROUP BY lane_position;
```

## Conclusion

This feature significantly improves the test set tracker for real-world swim practice scenarios. Coaches can now efficiently manage large groups with multiple swimmers per lane, while maintaining accurate individual timing. The iPad-optimized interface makes poolside use practical and professional.

---

**Files Modified:**
- `src/TestSetTracker.jsx` - Core timing logic and UI
- `src/TestSetDisplay.jsx` - Historical results display

**Files Created:**
- `database/test_sets_lane_migration.sql` - Database schema
- `LANE_SETUP_GUIDE.md` - User documentation
- `LANE_FEATURE_SUMMARY.md` - Technical documentation

**Database Changes:**
- 2 new columns in `test_sets`
- 3 new columns in `test_set_results`
- 2 new indexes for performance

