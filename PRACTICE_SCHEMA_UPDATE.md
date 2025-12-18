# Practice Schema Update - Training Group Field Fix

## Issue

The Training Group selector in Practice Builder wasn't working because of a data type mismatch:
- **Database field**: `training_group_id BIGINT` (expecting integer)
- **Actual data**: Group names like "Senior", "Age Group" (text strings)

## Solution

Changed `training_group_id` to `VARCHAR(100)` to store group names directly.

---

## 🔧 How to Apply the Fix

### If You Haven't Deployed Yet
✅ **No action needed!** The schema file (`database/practices_schema.sql`) has been updated. Just run it as normal.

### If You Already Deployed the Schema
Run this migration in Supabase SQL Editor:

1. **Open Supabase SQL Editor**
2. **Copy and paste** the contents of `database/practices_schema_update_group_field.sql`
3. **Click Run**
4. **Verify** you see: `training_group_id | character varying`

**Or** run this single command:

```sql
ALTER TABLE practices 
ALTER COLUMN training_group_id TYPE VARCHAR(100) 
USING training_group_id::VARCHAR;
```

---

## ✅ What This Fixes

**Before** (Broken):
- Training Group selector shows groups
- Selecting a group doesn't save
- Value always shows "All Groups"
- Console errors about data types

**After** (Fixed):
- Training Group selector works correctly
- Selected group saves properly
- Shows correct group when reopening practice
- No errors!

---

## 📊 Data Impact

### Safe Migration
- ✅ Existing `NULL` values stay `NULL` (means "All Groups")
- ✅ Any numeric values convert to text (unlikely to have any)
- ✅ No data loss
- ✅ Backwards compatible

### If You Had Practices Already
- Most practices probably have `training_group_id = NULL` (All Groups)
- These continue to work exactly as before
- Any with numeric IDs will be converted to text strings (harmless)

---

## 🧪 Test the Fix

1. **Open any practice** in Practice Builder
2. **Click the Training Group dropdown**
3. **Select a group** (e.g., "Senior")
4. **Click Save & Close**
5. **Reopen the practice**
6. **Verify** the selected group is shown in the dropdown

Should work perfectly now! ✅

---

## 🔮 Future Considerations

### Current Approach (Simple)
- Store group name as text: `"Senior"`, `"Age Group"`, etc.
- ✅ Simple, no extra tables needed
- ✅ Works with existing swimmer data
- ⚠️ If group name changes, need to update all practices

### Future Enhancement (Phase 2)
Could create a separate `training_groups` table:
```sql
CREATE TABLE training_groups (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100),
  coach_id UUID REFERENCES auth.users(id)
);
```

Then reference by ID. But for now, text names work fine!

---

## 📝 Updated Schema

The corrected field definition:

```sql
training_group_id VARCHAR(100),  -- Store group name or NULL for "all groups"
```

Instead of:

```sql
training_group_id BIGINT,  -- Old (broken)
```

---

## ✅ Status

- [x] Schema file updated
- [x] Code updated (removed parseInt)
- [x] Migration script created
- [x] Documentation updated
- [x] Ready to deploy

---

*Practice Schema Update - December 12, 2024*

