# Team Records Feature - Quick Start Guide

Get the team records feature up and running in 5 minutes! ⚡

## Prerequisites

- ✅ Supabase account with access to your StormTracker database
- ✅ StormTracker project cloned/downloaded
- ⚠️ Node.js (OPTIONAL - only needed for Method B below)

## Step-by-Step Setup

### Step 1: Create the Database Table (2 minutes)

1. Open your browser and go to https://supabase.com
2. Log in and select your StormTracker project
3. Click **SQL Editor** in the left sidebar
4. Open the file `database/team_records_schema.sql` from your project
5. Copy ALL the SQL code from that file
6. Paste it into the Supabase SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. You should see "Success. No rows returned" ✅

**What this does**: Creates the `team_records` table with proper indexes and security.

---

### Step 2: Load the Team Records Data (2 minutes)

**Choose Method A (No Node.js) or Method B (Node.js script):**

#### Method A: SQL Insert (Recommended for Vercel/No Node.js) ⭐

1. Stay in the Supabase SQL Editor (from Step 1)
2. Open the file `database/team_records_insert.sql` from your project
3. Copy ALL the SQL code (250+ INSERT statements)
4. Paste it into the Supabase SQL Editor
5. Click **Run** (this may take 10-30 seconds)
6. You should see at the bottom:
   ```
   total_records: 186
   (Shows first 10 records)
   ```

**Perfect for**: Vercel deployment, no local setup needed!

---

#### Method B: Node.js Script (Alternative)

1. Open your terminal/command prompt
2. Navigate to your StormTracker project folder:
   ```bash
   cd path/to/StormTracker
   ```
3. Run the data loader script:
   ```bash
   node database/load_team_records.js
   ```
4. You should see:
   ```
   📖 Reading team records data...
   ✅ Found 250+ team records to load
   📤 Inserting batch 1/6...
   🎉 Successfully loaded all team records!
   ```

**Perfect for**: Local development environment

---

**What this does**: Loads all Hurricane SC team records into your database.

---

### Step 3: Deploy to Vercel (If Applicable)

If you're deploying to Vercel, push your changes:

```bash
git add .
git commit -m "Add team records feature"
git push
```

Vercel will automatically deploy. The team records will work immediately since all data is in Supabase!

---

### Step 4: Verify It Works (1 minute)

1. Open StormTracker in your browser (local or deployed on Vercel)
2. Go to any swimmer's profile
3. Find an event where they have a recorded time (e.g., "50 Free")
4. Look for the "Standards & Goals" card
5. Click the **"View Ladder"** button
6. Look for an entry with:
   - 🌟 Gold/orange background
   - ⭐ Star icon
   - Text like "Team Record (Swimmer Name)"

**If you see the gold team record entry** → ✅ SUCCESS! You're done!

---

## Troubleshooting

### Problem: "Table 'team_records' does not exist"

**Solution**: You need to run Step 1 first. Make sure you ran the SQL schema file in Supabase.

---

### Problem: Script says "Error: Not authenticated" (Method B only)

**Solution**: Use Method A instead (SQL Insert)! It's easier and doesn't require authentication.

**Or**: The Supabase key in `supabase.js` needs proper permissions. Check that it's the service role key or that RLS policies allow inserts.

---

### Problem: "Team records not showing in the app"

**Checklist**:
- [ ] Did you run the SQL schema? (Step 1)
- [ ] Did you load the data? (Step 2)
- [ ] Does the swimmer have a time recorded for that event?
- [ ] Are you looking at the right age group? (Team records are age/gender specific)

**Debug**: Check in Supabase:
1. Go to Table Editor → `team_records`
2. You should see 250+ rows of data
3. Try this query in SQL Editor:
   ```sql
   SELECT * FROM team_records WHERE event = '50 Free' AND age_group = '11/12';
   ```
4. You should see 2 records (one Male, one Female)

---

### Problem: "Module not found" when running the script (Method B only)

**Solution**: Use Method A instead (SQL Insert) - no dependencies needed!

**Or**: Make sure you're in the project root directory and have dependencies installed:
```bash
npm install
```

Then try running the script again.

---

## What You Just Built

### For Swimmers 🏊‍♀️
- Can now see team records in their "View Ladder" display
- Know exactly how close they are to team immortality
- Get motivated by achievable, meaningful goals

### For Coaches 📋
- Team records automatically display for all swimmers
- Easy to update when new records are set
- Preserves team history and honors record holders

### The Data 📊
- 250+ records covering all age groups
- All individual events (Free, Back, Breast, Fly, IM)
- Distances from 25y to 1650y
- Short Course Yards (SCY)
- Both male and female divisions

---

## Next Steps

### Update a Record
When someone breaks a team record:

**Option A - Supabase Dashboard (Easiest)**
1. Supabase → Table Editor → `team_records`
2. Find the record (filter by event, age group, gender)
3. Click Edit
4. Update swimmer name, time, and date
5. Save

**Option B - Update JSON and Reload**
1. Edit `database/team_records_data.json`
2. In Supabase, delete records from `team_records` table
3. Run `node database/load_team_records.js` again

---

### Add More Records
To add records for additional events or courses:

1. Add entries to `database/team_records_data.json`:
   ```json
   {
     "event": "50 Free",
     "age_group": "11/12",
     "gender": "Female",
     "swimmer_name": "Jane Doe",
     "time_seconds": 24.50,
     "time_display": "24.50",
     "date": "2025-03-20"
   }
   ```
2. Run the loader script again (it will add new records)

---

## Need More Info?

📖 **Full Documentation**: See `database/README.md`  
🧪 **Testing Guide**: See `database/TESTING_GUIDE.md`  
🎨 **Visual Preview**: See `FEATURE_PREVIEW.md`  
📋 **Complete Summary**: See `TEAM_RECORDS_FEATURE_SUMMARY.md`

---

## Quick Reference

### Files You Created
```
database/
├── team_records_schema.sql     ← Database table definition
├── team_records_data.json      ← All team records
├── load_team_records.js        ← Script to load data
├── README.md                   ← Full documentation
└── TESTING_GUIDE.md           ← Test procedures

Modified Files:
├── src/StandardsModal.jsx      ← Added team record display
└── src/Standards.jsx          ← Pass age/gender to modal
```

### Key Commands
```bash
# Load team records into database
node database/load_team_records.js

# Start development server
npm run dev

# Build for production
npm run build
```

### Database Queries
```sql
-- Check if table exists
SELECT * FROM team_records LIMIT 5;

-- Count records
SELECT COUNT(*) FROM team_records;

-- Find specific record
SELECT * FROM team_records 
WHERE event = '50 Free' 
  AND age_group = '11/12' 
  AND gender = 'Female';

-- Update a record
UPDATE team_records 
SET swimmer_name = 'Jane Doe',
    time_seconds = 24.50,
    time_display = '24.50',
    date = '2025-03-20'
WHERE event = '50 Free' 
  AND age_group = '11/12' 
  AND gender = 'Female';
```

---

## Success Checklist

Setup complete when you can check all these:

- ✅ SQL schema ran successfully in Supabase
- ✅ Data loader script completed without errors
- ✅ 250+ records visible in Supabase table editor
- ✅ Opened a swimmer profile in StormTracker
- ✅ Clicked "View Ladder" on an event
- ✅ Saw gold/orange team record entry with star icon
- ✅ Team record shows correct swimmer name and time
- ✅ No errors in browser console
- ✅ Feature works on both desktop and mobile

---

## Support

Having trouble? Check these in order:

1. **This Quick Start Guide** - Make sure you followed all steps
2. **Browser Console** - Press F12 and check for error messages
3. **Supabase Logs** - Check your Supabase project logs
4. **README.md** - Full documentation with troubleshooting
5. **TESTING_GUIDE.md** - Detailed test cases

---

**That's it! You're done!** 🎉

The team records feature is now live and will automatically display for all swimmers in their Standards & Goals section.

Happy swimming! 🏊‍♂️🏊‍♀️

