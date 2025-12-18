# Fix: Parent Access to Test Sets

## Problem
Parents cannot view test set results on the Practice tab of their swimmer profiles. This is because Row Level Security (RLS) policies are not configured to allow parents to access the `test_sets` and `test_set_results` tables.

## Solution
Apply RLS policies that allow parents to view test sets and results for their linked swimmers.

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration
1. Open the file `database/test_sets_parent_access.sql`
2. Copy all the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Step 3: Verify the Fix
1. Log in as a parent user in your StormTracker app
2. Navigate to one of your swimmers
3. Click on the **Practice** tab
4. You should now see test set results!

## What This Does

The SQL script:
- ✅ Enables Row Level Security on `test_sets` and `test_set_results` tables
- ✅ Creates policies allowing coaches to manage their own test sets
- ✅ Creates policies allowing parents to view test sets for their linked swimmers
- ✅ Creates policies allowing parents to view test set results for their linked swimmers
- ✅ Adds performance indexes

## Troubleshooting

### Still not seeing test sets?
1. Check browser console for errors (Press F12)
2. Verify you have swimmers linked to your parent account
3. Verify those swimmers have test set results in the database
4. Try logging out and logging back in

### Error when running SQL?
- If you see "policy already exists" errors, that's okay - the script handles this with `DROP POLICY IF EXISTS`
- If you see "table does not exist", you may need to create the test_sets tables first

## Need Help?
Check the browser console (F12) for specific error messages and share them for debugging.

