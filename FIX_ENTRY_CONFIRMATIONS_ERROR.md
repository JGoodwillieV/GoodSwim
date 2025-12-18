# Fix: "TypeError: Failed to fetch" Error

## Problem

When you tried to scratch 2 events and clicked "Submit Changes" in the Parent Dashboard, you got this error:

```
Error saving confirmation: TypeError: Failed to fetch
```

## Root Cause

The `entry_confirmations` table and its supporting database functions **don't exist** in your Supabase database. The application code was trying to insert data into a table that wasn't created yet.

## Solution

You need to create the missing database table and functions. Follow these steps:

### Quick Fix (Recommended)

1. **Log in to Supabase**
   - Go to https://supabase.com
   - Open your StormTracker project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Setup Script**
   - Open the file: `database/entry_confirmations_complete_setup.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **"Run"** (or press Ctrl/Cmd + Enter)

4. **Verify Success**
   - You should see "Success. No rows returned" (this is normal)
   - Check that the table was created:
     ```sql
     SELECT * FROM entry_confirmations;
     ```
   - You should see an empty table (no error)

5. **Test the Fix**
   - Go back to your StormTracker app
   - Refresh the page (F5)
   - Try confirming meet entries again
   - The error should be gone!

### What Was Created

The setup script created:

✅ **Table**: `entry_confirmations` - stores parent confirmations
✅ **Indexes**: For efficient database queries
✅ **RLS Policies**: Security rules for parent/coach access
✅ **Triggers**: Auto-update timestamps
✅ **Functions**: 
   - `get_parent_pending_actions()` - finds pending confirmations
   - `get_meet_confirmation_stats()` - tracks confirmation status

### Alternative: Individual Files

If you prefer to run files separately:

1. Run `database/entry_confirmations_schema.sql` first
2. Then run `database/entry_confirmations_functions.sql`

Both methods achieve the same result.

## Testing

After running the SQL script, test the feature:

1. **As a Parent**:
   - Log in to StormTracker
   - Go to Parent Dashboard
   - Look for pending meet confirmations
   - Click on a confirmation
   - Select events to scratch
   - Add notes (optional)
   - Click "Submit Changes"
   - Should see success (no error!)

2. **As a Coach**:
   - Go to Meet Entries Manager
   - Select a published meet
   - Click "Confirmations" tab
   - You should see parent confirmations

## Troubleshooting

### Still getting "Failed to fetch"?

**Check 1**: Verify table exists
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'entry_confirmations';
```
Should return one row.

**Check 2**: Verify RLS policies
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'entry_confirmations';
```
Should return 4 policies.

**Check 3**: Verify functions
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%parent_pending%';
```
Should return `get_parent_pending_actions`.

### Permission Errors?

If you get permission errors after creating the table:

1. Check that you're logged in as a parent
2. Verify your parent account has a `user_id` that matches your auth user
3. Check the swimmer is linked to your parent account:
   ```sql
   SELECT s.name, p.account_name 
   FROM swimmers s
   JOIN parents p ON s.parent_id = p.id
   WHERE p.user_id = auth.uid();
   ```

### Other Issues

See the complete guide: `database/ENTRY_CONFIRMATIONS_SETUP.md`

## Why This Happened

The entry confirmations feature code was added to the application, but the corresponding database setup was never run. This is a common issue when:

- Features are developed but database migrations aren't tracked
- New environments are set up without all database scripts
- Database setup steps are missed during deployment

## Prevention

Going forward, consider:

1. **Document all database changes** in the `/database` folder
2. **Run all SQL scripts** when setting up new environments
3. **Check Supabase logs** when you get "Failed to fetch" errors
4. **Test database connectivity** before testing new features

## Need Help?

If you're still having issues after following this guide:

1. Check the browser console for more detailed error messages
2. Check Supabase project logs (Logs & Reports section)
3. Verify all prerequisite tables exist (meets, meet_entries, swimmers, parents)
4. Review `database/ENTRY_CONFIRMATIONS_SETUP.md` for full documentation

---

**TL;DR**: Run `database/entry_confirmations_complete_setup.sql` in Supabase SQL Editor, then refresh your app and try again.

