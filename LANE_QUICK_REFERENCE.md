# Lane Test Set - Quick Reference Card

## Before You Start

### Database Setup (One-Time Only)
1. Go to Supabase → SQL Editor
2. Run `database/test_sets_lane_migration.sql`
3. Click "Run" - Done! ✅

## Creating a Lane-Based Test Set

### 1️⃣ Basic Setup
- Tap **"New Test Set"**
- Select your **group**
- Select **swimmers**
- Set **reps, distance, stroke**

### 2️⃣ Enable Lanes
- Toggle **"Lane Setup"** to ON
- Set **Stagger Interval** (usually 5 seconds)

### 3️⃣ Organize Lanes
**Quick Way:**
- Tap **"4 Lanes"** button (or 2, 3, 6)
- Swimmers auto-distributed ✨

**Manual Way:**
- Use ⬆️ ⬇️ to reorder swimmers
- Use ❌ to remove from lane
- Drag swimmers to different lanes

### 4️⃣ Verify & Start
- Check each lane order
- Confirm stagger seconds
- Tap **"Start Test Set"**

## During the Set

### Understanding the Display

```
Lane 1                          2/3 finished
┌─────────────────────────────────────────┐
│ (1) Alice      24.56  ✓                 │
│ (2) Bob        25.12  ✓   +5s start    │
│ (3) Carol      Wait...      +10s start  │
└─────────────────────────────────────────┘
```

- **(Number)** = Position in lane
- **+Xs start** = Stagger offset
- **Wait...** = Not started yet
- **✓** = Finished this rep

### Timing Process
1. Hit **START** when first swimmers begin
2. Timers start automatically based on position:
   - Position 1: 0 seconds
   - Position 2: +5 seconds (or your stagger)
   - Position 3: +10 seconds
3. **Tap swimmer's card** when they touch
4. Time is automatically correct ✨
5. Use **"Next Rep"** to advance

### Controls
- **START/PAUSE** - Control timer
- **Undo** - Undo last tap
- **Restart Rep** - Clear current rep
- **Next Rep** - Advance to next rep
- **End Set** - Finish early

## Common Scenarios

### 3 Swimmers Per Lane
```
Lane 1: Alice (0s) → Bob (+5s) → Carol (+10s)
Lane 2: Dave (0s) → Emma (+5s) → Frank (+10s)
```

### 4 Swimmers Per Lane
```
Lane 1: Swimmer 1 (0s) → Swimmer 2 (+5s) → 
        Swimmer 3 (+10s) → Swimmer 4 (+15s)
```

### Adjusting Stagger
- **Faster swimmers**: 5 seconds
- **Mixed abilities**: 10 seconds
- **Beginners**: 15 seconds

## Tips & Tricks

### Setup Tips
✅ Put similar speeds in same lane  
✅ Test stagger with 1 rep first  
✅ Keep consistent order throughout practice  
✅ Use Quick Setup for even distribution  

### Timing Tips
✅ Watch position badges (1, 2, 3)  
✅ "Wait..." means don't tap yet  
✅ If someone misses start, still tap when they finish  
✅ Use landscape mode on iPad  

### Organization Tips
✅ Assign lanes based on pool layout  
✅ Keep fastest swimmers in position 1  
✅ Balance lane sizes evenly  
✅ Write lane assignments on whiteboard  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Wrong stagger time | Set it before hitting START |
| Swimmer in wrong lane | Reorganize in setup screen |
| Missed a tap | Use "Undo" button |
| Need to restart | Use "Restart Rep" |
| Wrong order in lane | Use ⬆️ ⬇️ arrows in setup |

## Example Practice Set

**Set:** 10 x 100 Freestyle @ 1:30  
**Group:** Senior (12 swimmers)  
**Setup:** 4 lanes, 5-second stagger

```
Lane 1: Alice, Bob, Carol
Lane 2: Dave, Emma, Frank
Lane 3: Grace, Henry, Iris
Lane 4: Jack, Kate, Leo
```

**What Happens:**
- 0:00 - START: Alice, Dave, Grace, Jack begin
- 0:05 - Bob, Emma, Henry, Kate begin
- 0:10 - Carol, Frank, Iris, Leo begin
- Coach taps each card when they finish
- All times accurate to individual starts
- Move to next rep at 1:30

## Post-Practice

### Viewing Results
- Results automatically show lane info
- Lane column shows: **L1 #2** = Lane 1, Position 2
- Times are accurate swim times
- Compare by lane or by swimmer

### Next Time
- Lane configurations not saved (setup each time)
- Use same organization for consistency
- Track progress over time

---

## Need Help?

📖 Full Guide: `LANE_SETUP_GUIDE.md`  
🔧 Technical Details: `LANE_FEATURE_SUMMARY.md`  
💾 Database: `database/test_sets_lane_migration.sql`

## Quick Checklist

Before starting:
- [ ] Database migration run
- [ ] Swimmers selected
- [ ] Lanes organized
- [ ] Stagger time set
- [ ] iPad in landscape mode
- [ ] Pool position visible to all lanes

During:
- [ ] Timer running
- [ ] Tapping as swimmers finish
- [ ] Watching for "Wait..." indicators
- [ ] Using Next Rep between repetitions

After:
- [ ] Save results
- [ ] Review times
- [ ] Note any issues
- [ ] Plan next set

---

**Happy Timing! 🏊‍♀️🏊‍♂️**

