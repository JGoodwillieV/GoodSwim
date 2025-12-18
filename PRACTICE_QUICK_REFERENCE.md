# Practice Feature - Quick Reference Card

## 🚀 Getting Started (3 Steps)

1. **Run SQL** → Supabase SQL Editor → Paste `database/practices_schema.sql` → Run
2. **Deploy** → `git push` (if using Vercel)
3. **Use** → StormTracker → Click "Practices" in sidebar → "+ New Practice"

---

## 📋 Key Actions

| Action | How To |
|--------|--------|
| **Create Practice** | Practices → + New Practice |
| **Edit Practice** | Click on practice in calendar or recent list |
| **Add Set** | In builder → + Add Set → Choose type |
| **Add Item** | In set → + Add Item → Fill details |
| **Print** | In builder → Print button → Print |
| **Save Template** | In builder → Save as Template → Name it |
| **Copy Practice** | Recent list → Copy button |
| **Schedule** | Set Date & Time in practice metadata |

---

## 🏊 Set Types & Colors

| Type | Color | Use For |
|------|-------|---------|
| **Warmup** | 🔵 Blue | Starting sets |
| **Pre-Set** | 🟣 Purple | Before main work |
| **Main Set** | 🟢 Green | Primary work |
| **Test Set** | 🟠 Orange | Timed sets for tracking |
| **Cooldown** | ⚪ Gray | Recovery at end |
| **Dryland** | 🟡 Yellow | Out-of-water work |

---

## ✏️ Adding Set Items

### Required Fields
- **Reps** (number)
- **Distance** (yards)
- **Stroke** (free, back, breast, fly, IM, choice, drill, kick)

### Optional Fields
- **Interval** (e.g., "1:30", ":15 rest")
- **Description** (e.g., "descend 1-4")
- **Equipment** (fins, paddles, snorkel, kickboard, pull buoy, band)
- **Intensity** (easy, moderate, fast, sprint, race_pace)

---

## 🎯 Focus Tags

Available tags:
- aerobic
- threshold
- speed
- technique
- IM
- sprint
- distance
- race_prep

Use tags to organize and filter practices!

---

## 📊 Auto-Calculation

✅ **Automatically Calculated:**
- Item yards = reps × distance
- Set yards = sum of items
- Practice yards = sum of sets
- Estimated time = yards × 1.5s / 60

No manual math needed!

---

## 🖨️ Printing Tips

1. Click **Print** button in practice builder
2. Use **landscape orientation** for best results
3. Save as **PDF** to share digitally
4. Print on **waterproof paper** for poolside

---

## 📚 Templates

### Save as Template
1. Open practice
2. Click "Save as Template"
3. Enter name
4. Done!

### Use Template
1. Click "Templates" in Practice Hub
2. Select template
3. Edit and schedule

Templates save structure, not dates!

---

## 🕐 Test Set Integration (MVP)

### How to Use
1. Add set, choose "Test Set"
2. Set displays orange badge
3. During practice, manually launch Test Set Tracker
4. Configure and run

**Phase 2**: One-tap launch with auto-population!

---

## 📅 Calendar Navigation

- **This Week** shows Mon-Sun
- Use **◀ ▶** arrows to change weeks
- Click **date** to add practice
- Click **practice card** to edit
- **Today** is highlighted in blue

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Yards not updating | Wait a moment, refresh practice |
| Can't save template | Check you entered a name |
| Print looks wrong | Use landscape, try Chrome/Firefox |
| Practice not in calendar | Set a scheduled_date |

---

## 💡 Pro Tips

1. **Use consistent naming** - "Day Time - Focus" (e.g., "Mon AM - Sprint")
2. **Tag everything** - Makes searching easier later
3. **Copy & modify** - Start with similar practice
4. **Schedule ahead** - Plan your week on Sunday
5. **Save favorites** - Build your template library
6. **Print practices** - Have physical copy on deck

---

## 📱 Mobile Access

Practice feature works on:
- ✅ Desktop (full features)
- ✅ Tablet (full features)
- ✅ Mobile (full features, bottom nav)

Access "Practice" from bottom navigation on mobile!

---

## ⌨️ Keyboard Shortcuts

Currently none - coming in Phase 2!

---

## 🎓 Example Practice

**Title**: Thursday AM - Aerobic Base  
**Group**: Senior  
**Date**: Dec 19, 2024  
**Time**: 5:30 AM  
**Tags**: aerobic, endurance

### WARMUP (800y)
- 4 x 100 Free @ 1:30 - easy
- 4 x 50 Choice @ :50 - drill/swim

### MAIN SET (2000y)
3 rounds:
- 1 x 200 Free @ 2:45 - descend
- 4 x 50 Free @ :45 - fast
- 1 x 100 Easy

### COOLDOWN (400y)
- 4 x 100 Easy - choice

**Total**: 3,200 yards • 48 min

---

## 🚀 Coming in Phase 2

- AI set suggestions
- One-tap test set launch
- Recurring schedules
- Practice analytics
- Team template library
- Mobile run mode
- Voice timer integration

---

## 📞 Need Help?

1. Read `PRACTICE_FEATURE_SETUP.md` for detailed guide
2. Check `PRACTICE_FEATURE_SUMMARY.md` for technical details
3. Review examples in documentation

---

**Quick Start**: Practices → + New Practice → Build → Save → Done! 🎉

