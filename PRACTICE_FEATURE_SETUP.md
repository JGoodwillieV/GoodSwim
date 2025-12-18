# Practice Feature - Setup & Usage Guide

## 🎉 Welcome to the Practice Feature (MVP - Phase 1)

This guide will help you set up and start using StormTracker's new Practice Planning feature!

---

## ✅ What's Included in MVP (Phase 1)

The Practice Feature MVP includes everything coaches need to build, schedule, and run swim practices:

1. **Practice Builder** - Create practices with sets and items
2. **Yardage Auto-Calculation** - Automatic totals for sets and practices
3. **Save & Load Practices** - Store and retrieve your practices
4. **Test Set Flag** - Mark sets as test sets (manual link to tracker)
5. **Print Layout** - Clean, deck-ready printouts
6. **Basic Templates** - Save practices as templates for reuse
7. **Practice Calendar** - Weekly view of scheduled practices

---

## 📋 Quick Start (5 Minutes)

### Step 1: Set Up the Database (2 minutes)

1. Open your browser and go to https://supabase.com
2. Log in and select your StormTracker project
3. Click **SQL Editor** in the left sidebar
4. Open the file `database/practices_schema.sql` from your project
5. Copy ALL the SQL code from that file
6. Paste it into the Supabase SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. You should see "Success" ✅

**What this does**: Creates 4 new tables:
- `practices` - Your swim practices
- `practice_sets` - Sets within practices (warmup, main set, etc.)
- `practice_set_items` - Individual items (4x100 Free @ 1:30)
- `practice_templates` - Saved practice templates

### Step 2: Deploy to Vercel (If Using Vercel)

If you're using Vercel deployment:

```bash
git add .
git commit -m "Add Practice Feature MVP"
git push
```

Vercel will automatically deploy your changes!

### Step 3: Start Using It! (1 minute)

1. Open StormTracker in your browser
2. Look for **"Practices"** in the sidebar (or "Practice" in mobile bottom nav)
3. Click **"+ New Practice"** to create your first practice
4. Build your practice and save!

---

## 🏊 How to Use the Practice Feature

### Creating Your First Practice

1. **Navigate to Practices**
   - Click "Practices" in the sidebar
   - Or click "Plan Practice" on the Dashboard

2. **Click "+ New Practice"**
   - Opens the Practice Builder

3. **Fill in Practice Details**
   - Title (e.g., "Thursday AM - Aerobic Base")
   - Training Group (or leave as "All Groups")
   - Date and Time
   - Focus Tags (aerobic, sprint, technique, etc.)

4. **Add Sets**
   - Click "+ Add Set"
   - Choose set type: Warmup, Main Set, Test Set, Cooldown, etc.

5. **Add Items to Sets**
   - Click "+ Add Item" within a set
   - Enter:
     - Reps (e.g., 4)
     - Distance (e.g., 100)
     - Stroke (Free, Back, Breast, Fly, IM, etc.)
     - Interval (e.g., "1:30" or ":15 rest")
     - Description (e.g., "descend 1-4")
     - Equipment (fins, paddles, etc.)
     - Intensity (easy, moderate, fast, sprint, race pace)

6. **Watch the Totals Update Automatically**
   - Total yardage calculates in real-time
   - Set totals and practice totals update automatically

7. **Save Your Practice**
   - Click "Save & Close" to return to Practice Hub
   - Your practice is auto-saved as you build!

---

## 🗓️ Practice Hub Features

### This Week View

The weekly calendar shows:
- All practices scheduled for the current week
- Each practice displays:
  - Title
  - Time
  - Total yardage
- Click any practice to edit it
- Use arrows to navigate between weeks

### Quick Actions

1. **Templates** - Browse saved practice templates (Phase 2)
2. **Copy Last Practice** - Duplicate your most recent practice
3. **AI Suggest** - Get AI-generated practice ideas (Phase 2)

### Recent Practices

- View your last 10 practices
- Quick Edit or Copy buttons for each
- See date, yardage, and focus tags

---

## 📝 Practice Builder Features

### Practice Metadata

- **Title**: Give your practice a name
- **Training Group**: Assign to a specific group or "All Groups"
- **Date**: Schedule for a specific date (optional)
- **Time**: Set practice start time
- **Status**: Draft, Scheduled, Completed, or Canceled
- **Focus Tags**: Tag practices (aerobic, sprint, technique, etc.)

### Set Types

- **Warmup** - Blue background
- **Pre-Set** - Purple background
- **Main Set** - Green background
- **Test Set** - Orange background (with test set integration notice)
- **Cooldown** - Gray background
- **Dryland** - Yellow background

### Set Item Details

Each item in a set can have:
- **Reps x Distance** (e.g., 4 x 100)
- **Stroke** (Free, Back, Breast, Fly, IM, Choice, Drill, Kick)
- **Interval** (e.g., "1:30" or ":15 rest")
- **Description** (e.g., "descend 1-4", "build by 25")
- **Equipment** (fins, paddles, snorkel, kickboard, pull buoy, band)
- **Intensity** (easy, moderate, fast, sprint, race_pace)
- **Notes** (coach-only notes)

### Auto-Calculation

The feature automatically calculates:
- **Yards per item** = reps × distance
- **Yards per set** = sum of all items in set
- **Total practice yards** = sum of all sets
- **Estimated time** = rough estimate based on yardage

### Stroke Breakdown

At the bottom of the builder, see a breakdown by stroke:
- Free: 3200y
- Kick: 300y
- IM: 400y
- etc.

---

## 🖨️ Printing Practices

### How to Print

1. Open any practice in the Builder
2. Click the **"Print"** button in the top-right
3. Review the print preview
4. Click **"Print"** to print or save as PDF

### What Gets Printed

The print layout includes:
- Practice title and date
- Total yardage and focus
- All sets with clean formatting
- Each item clearly listed with reps, distance, stroke, interval, and description
- Clean, deck-ready format optimized for poolside use

### Print Tips

- Use landscape orientation for better formatting
- Save as PDF to share digitally with assistant coaches
- Print on waterproof paper for poolside durability

---

## 📚 Saving Practices as Templates

### Create a Template

1. Open a practice you want to save as a template
2. Click **"Save as Template"**
3. Enter a template name
4. Template is saved to your personal library

### Using Templates

Templates store:
- All sets and their structure
- All items and their details
- Focus tags
- Description

Templates do **not** store:
- Specific dates
- Training group assignments

This allows you to reuse practice structures across different groups and dates!

---

## 🧪 Test Set Integration (MVP)

### How It Works

1. When building a practice, mark a set as **"Test Set"**
2. The set displays an orange badge: "🕐 TEST SET"
3. An integration notice appears:
   > "When you reach this set, you can launch the Test Set Tracker with pre-configured settings."

### Manual Integration (MVP)

In Phase 1, the integration is **manual**:
- Mark the set as a test set in your practice
- During practice, manually navigate to the Test Set Tracker
- Configure and run your test set

### Future Enhancement (Phase 2)

In Phase 2, we'll add:
- One-tap launch from practice to Test Set Tracker
- Auto-populated swimmer list based on training group
- Pre-configured event, reps, and intervals
- Automatic result linking back to practice

---

## 🎯 Example Practice Workflow

### Thursday AM - Aerobic Base (4500 yards)

**Training Group**: Senior
**Date**: Dec 19, 2024
**Time**: 5:30 AM
**Focus**: Aerobic, Endurance

#### WARMUP (800 yards)
- 4 x 100 Free @ 1:30 - easy
- 4 x 50 Choice @ :50 - drill/swim by 25

#### PRE-SET (600 yards)
- 6 x 50 Kick @ 1:00 - fins, build each
- 6 x 50 Drill @ :55 - choice stroke

#### MAIN SET (2000 yards)
3 rounds:
- 1 x 200 Free @ 2:45 - descend 1-3
- 4 x 50 Free @ :45 - fast
- 1 x 100 Easy @ --- - recovery

#### TEST SET (1000 yards) 🕐
- 10 x 100 Free @ 1:30 - best average
- *This is a test set - launch Test Set Tracker when reached*

#### COOLDOWN (400 yards)
- 4 x 100 Easy @ --- - choice, stretching

**Total**: 4,800 yards • Est. Time: 72 min

---

## 💡 Tips & Best Practices

### Practice Planning

1. **Use Focus Tags Consistently** - Makes finding practices easier later
2. **Schedule Ahead** - Plan your week on Sunday
3. **Copy & Modify** - Start with a template, then adjust
4. **Save Favorites as Templates** - Build your library of go-to practices

### During Practice

1. **Print the Practice** - Have a physical copy on deck
2. **Use Test Set Integration** - Mark test sets for easy tracking
3. **Update Status** - Mark practice as "Completed" after finishing

### Organization

1. **Name Practices Clearly** - Include day, time, and focus (e.g., "Mon PM - Sprint Work")
2. **Use Training Groups** - Filter practices by group
3. **Tag Everything** - Focus tags help you analyze practice distribution

---

## 🔧 Troubleshooting

### Problem: "Practice not showing in calendar"

**Solution**: Make sure you set a `scheduled_date` for the practice.

### Problem: "Total yards not updating"

**Solution**: 
- Wait a moment - the database triggers take a second to fire
- Refresh the practice (close and reopen)
- Check that all items have valid reps and distance

### Problem: "Can't save template"

**Solution**: Make sure you entered a template name when prompted.

### Problem: "Print layout looks wrong"

**Solution**: 
- Try landscape orientation
- Use Chrome or Firefox for best results
- Check your browser's print settings

---

## 📊 Database Structure (For Developers)

### Tables

1. **practices**
   - Stores practice metadata
   - Links to coach/user
   - Contains totals (auto-calculated)

2. **practice_sets**
   - Stores sets within practices
   - Has order_index for sorting
   - Contains set totals (auto-calculated)

3. **practice_set_items**
   - Individual items (reps x distance)
   - Has order_index for sorting
   - Contains all item details

4. **practice_templates**
   - Saved practice templates
   - Stores full practice structure as JSONB
   - Can be shared or personal

### Auto-Calculation

The database uses PostgreSQL triggers to automatically:
1. Calculate set yards when items change
2. Calculate practice yards when sets change
3. Update `updated_at` timestamps

This means you don't need to manually calculate totals - they're always up-to-date!

---

## 🚀 What's Next (Phase 2)

Coming soon:
- **AI Set Suggestions** - Get practice ideas from AI
- **Full Test Set Integration** - One-tap launch from practice
- **Team Template Library** - Share templates across coaches
- **Recurring Schedules** - Auto-schedule repeating practices
- **Practice Analytics** - See yardage distribution over time
- **Curated Library** - Pre-built practices from USA Swimming

---

## 🎓 Need Help?

### Quick Reference

- **Create Practice**: Practices → + New Practice
- **Edit Practice**: Click on any practice in calendar or recent list
- **Print Practice**: Open practice → Print button
- **Save Template**: Open practice → Save as Template
- **Copy Practice**: Use "Copy" button in recent practices list

### Common Questions

**Q: Can I schedule the same practice for multiple groups?**
A: Yes! Copy the practice and assign it to different groups.

**Q: Can I import practices from another system?**
A: Not yet - Phase 2 will include import/export features.

**Q: Can parents see practices?**
A: Not yet - Phase 2 will include parent sharing options.

**Q: Can I export practices to PDF?**
A: Yes! Use the Print feature and select "Save as PDF".

---

## 📝 Feedback

This is Phase 1 (MVP) of the Practice Feature. We'd love your feedback:
- What features do you use most?
- What's missing that you need?
- What would make practice planning easier?

---

**Happy Practice Planning! 🏊‍♂️🏊‍♀️**

The Practice Feature is designed to save you time and help you build better, more organized practices. Enjoy!

