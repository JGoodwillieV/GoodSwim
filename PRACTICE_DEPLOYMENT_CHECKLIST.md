# Practice Feature - Deployment Checklist

## 📋 Pre-Deployment Verification

Before deploying to production, verify all files are present:

### Code Files
- [ ] `database/practices_schema.sql` exists
- [ ] `src/PracticeHub.jsx` exists
- [ ] `src/PracticeBuilder.jsx` exists
- [ ] `src/App.jsx` has been modified (imports, navigation)

### Documentation Files
- [ ] `PRACTICE_FEATURE_SETUP.md` exists
- [ ] `PRACTICE_FEATURE_SUMMARY.md` exists
- [ ] `PRACTICE_QUICK_REFERENCE.md` exists
- [ ] `PRACTICE_MVP_COMPLETE.md` exists
- [ ] `PRACTICE_DEPLOYMENT_CHECKLIST.md` exists (this file)

### Code Quality
- [ ] No linting errors in PracticeHub.jsx
- [ ] No linting errors in PracticeBuilder.jsx
- [ ] No linting errors in App.jsx
- [ ] All imports are correct
- [ ] All icon references are valid

---

## 🗄️ Database Setup (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com
2. Log in to your account
3. Select your StormTracker project
4. Click **"SQL Editor"** in left sidebar
5. Click **"New query"**

### Step 2: Run Database Migration

1. Open `database/practices_schema.sql` from your project
2. Copy **ALL** the SQL code (entire file)
3. Paste into Supabase SQL Editor
4. Click **"Run"** button (or Ctrl+Enter)
5. Wait for execution to complete

### Step 3: Verify Tables Created

Expected output: **"Success"** with no errors

Run this verification query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('practices', 'practice_sets', 'practice_set_items', 'practice_templates');
```

You should see 4 rows returned.

### Step 4: Verify Triggers

Run this query:
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table IN ('practices', 'practice_sets', 'practice_set_items');
```

You should see 2 triggers:
- `update_set_yards_on_item_change`
- `update_practice_yards_on_set_change`

### Step 5: Verify RLS Policies

Run this query:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('practices', 'practice_sets', 'practice_set_items', 'practice_templates');
```

You should see multiple policies (2-3 per table).

---

## 🚀 Code Deployment

### Option A: Vercel Deployment (Recommended)

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add Practice Feature MVP - Phase 1"
   ```

2. **Push to Repository**
   ```bash
   git push origin main
   ```
   (Replace `main` with your branch name if different)

3. **Wait for Vercel**
   - Vercel will automatically detect the push
   - Build process starts automatically
   - Watch the build logs in Vercel dashboard
   - Wait for "Deployment Ready" message

4. **Verify Deployment**
   - Visit your StormTracker URL
   - Check that new "Practices" menu item appears
   - Try creating a test practice

### Option B: Manual Deployment

If not using Vercel:

1. **Build the Project**
   ```bash
   npm run build
   ```

2. **Test Build Locally**
   ```bash
   npm run preview
   ```

3. **Deploy to Your Host**
   - Upload build files to your hosting provider
   - Follow your host's specific deployment process

---

## ✅ Post-Deployment Testing

### Test 1: Database Connection
1. Log in to StormTracker
2. Navigate to "Practices" in sidebar
3. Should see Practice Hub with empty state
4. ✅ Pass if page loads without errors

### Test 2: Create Practice
1. Click "+ New Practice"
2. Should open Practice Builder
3. Enter practice title: "Test Practice"
4. Click "Save & Close"
5. ✅ Pass if practice saves and returns to hub

### Test 3: Add Set
1. Open the test practice
2. Click "+ Add Set"
3. Choose "Warmup"
4. Should see new warmup set
5. ✅ Pass if set appears

### Test 4: Add Item
1. In the warmup set, click "+ Add Item"
2. Enter:
   - Reps: 4
   - Distance: 100
   - Stroke: Free
   - Interval: 1:30
3. Click "Add Item"
4. Should see "4 x 100 Free @ 1:30"
5. ✅ Pass if item appears

### Test 5: Auto-Calculation
1. Check set total: Should show "400 yards"
2. Check practice total: Should show "400" in footer
3. Add another item: 4 x 50 Free @ :50
4. Set should update to "600 yards"
5. Practice should update to "600"
6. ✅ Pass if totals auto-update

### Test 6: Print
1. Click "Print" button
2. Should open print preview
3. Check formatting looks good
4. Try printing or save as PDF
5. ✅ Pass if print works

### Test 7: Save as Template
1. Click "Save as Template"
2. Enter name: "Test Template"
3. Should show success message
4. ✅ Pass if template saves

### Test 8: Calendar View
1. Return to Practice Hub
2. Set a date for the test practice
3. Practice should appear in weekly calendar
4. ✅ Pass if practice shows on correct date

### Test 9: Copy Practice
1. In recent practices, find test practice
2. Click "Copy" button
3. Should create duplicate
4. ✅ Pass if copy is created

### Test 10: Mobile View
1. Open StormTracker on mobile device (or resize browser)
2. Check bottom navigation shows "Practice"
3. Tap Practice
4. Should see Practice Hub
5. ✅ Pass if mobile layout works

---

## 🐛 Troubleshooting

### Issue: SQL Error During Migration

**Symptoms**: Red error message in Supabase SQL Editor

**Solutions**:
1. Check you copied the entire file (scroll to bottom)
2. Make sure tables don't already exist (drop them first if needed):
   ```sql
   DROP TABLE IF EXISTS practice_set_items CASCADE;
   DROP TABLE IF EXISTS practice_sets CASCADE;
   DROP TABLE IF EXISTS practice_templates CASCADE;
   DROP TABLE IF EXISTS practices CASCADE;
   ```
   Then re-run the schema file.

### Issue: "Cannot read properties of undefined" Error

**Symptoms**: JavaScript error in browser console

**Solutions**:
1. Check all imports in App.jsx are correct
2. Verify PracticeHub.jsx and PracticeBuilder.jsx exist in src/
3. Clear browser cache and reload
4. Check for typos in component names

### Issue: "Row Level Security Policy Violation"

**Symptoms**: Can't save practices, permission denied

**Solutions**:
1. Verify user is authenticated (logged in)
2. Check RLS policies were created:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'practices';
   ```
3. Re-run the schema file if policies missing

### Issue: Totals Not Calculating

**Symptoms**: Yards stay at 0 even after adding items

**Solutions**:
1. Check triggers were created:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%yards%';
   ```
2. Re-run the schema file if triggers missing
3. Try manually refreshing the practice (close and reopen)

### Issue: "Practices" Menu Not Showing

**Symptoms**: Can't find Practices in navigation

**Solutions**:
1. Verify App.jsx was modified correctly
2. Check sidebar items array includes 'practice-hub'
3. Check mobile nav items array includes 'practice-hub'
4. Hard refresh browser (Ctrl+Shift+R)

### Issue: Print Layout Broken

**Symptoms**: Print preview looks wrong

**Solutions**:
1. Use landscape orientation
2. Try Chrome or Firefox (best compatibility)
3. Check print preview before printing
4. Adjust margins in print dialog if needed

---

## 📊 Monitoring

After deployment, monitor these metrics:

### Usage Metrics
- Number of practices created per day
- Number of sets per practice (average)
- Number of items per set (average)
- Templates created per coach
- Prints per practice

### Performance Metrics
- Page load time (Practice Hub)
- Practice save time
- Print generation time
- Database query response time

### Error Monitoring
- JavaScript errors in console
- Failed API requests
- Database connection issues
- RLS policy violations

---

## 🔄 Rollback Plan

If critical issues occur after deployment:

### Emergency Rollback

1. **Revert Code Changes**
   ```bash
   git revert HEAD
   git push
   ```

2. **Remove Database Tables** (if necessary)
   ```sql
   DROP TABLE IF EXISTS practice_set_items CASCADE;
   DROP TABLE IF EXISTS practice_sets CASCADE;
   DROP TABLE IF EXISTS practice_templates CASCADE;
   DROP TABLE IF EXISTS practices CASCADE;
   ```

3. **Redeploy Previous Version**
   - Vercel will automatically deploy the reverted code
   - Verify old version works

### Partial Rollback

If only specific issues:
- Hide "Practices" menu item via CSS
- Fix issue in new branch
- Deploy fix when ready

---

## 📝 Post-Deployment Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Check user feedback
- [ ] Verify auto-calculation working
- [ ] Test on different devices
- [ ] Fix any critical bugs

### Week 2-4
- [ ] Gather coach feedback
- [ ] Document any issues
- [ ] Plan Phase 2 features based on usage
- [ ] Optimize slow queries if needed

### Month 1
- [ ] Review usage metrics
- [ ] Identify most-used features
- [ ] Prioritize Phase 2 development
- [ ] Celebrate success! 🎉

---

## 🎯 Success Criteria

Deployment is successful when:

✅ All 10 post-deployment tests pass  
✅ No console errors during normal use  
✅ Coaches can create and save practices  
✅ Auto-calculation works correctly  
✅ Print feature produces good output  
✅ Mobile view is functional  
✅ Calendar view shows practices  
✅ Templates can be saved and used  

---

## 📞 Support Resources

### Documentation
- `PRACTICE_FEATURE_SETUP.md` - User guide
- `PRACTICE_QUICK_REFERENCE.md` - Quick help
- `PRACTICE_FEATURE_SUMMARY.md` - Technical docs

### Database Queries
See schema file for table structure and example queries

### Code
- `src/PracticeHub.jsx` - Hub component
- `src/PracticeBuilder.jsx` - Builder component
- `database/practices_schema.sql` - Database schema

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] Database migration successful
- [ ] Code deployed to production
- [ ] All 10 tests passing
- [ ] No console errors
- [ ] Mobile view working
- [ ] Print feature working
- [ ] Auto-calculation working
- [ ] Documentation reviewed
- [ ] Rollback plan documented
- [ ] Monitoring set up
- [ ] Team notified of new feature

---

## 🎉 Deployment Complete!

Once all items are checked, the Practice Feature MVP is **LIVE IN PRODUCTION**!

Coaches can now:
- Build practices digitally
- Save and reuse templates
- Print professional practice sheets
- Track yardage automatically
- Schedule practices on calendar

**Congratulations on shipping a major feature! 🚀**

---

*Practice Feature MVP - Deployment Checklist*  
*Version 1.0.0 - December 12, 2024*

