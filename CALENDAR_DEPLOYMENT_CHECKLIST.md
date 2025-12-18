# Calendar Feature - Deployment Checklist

## 🎯 Pre-Deployment Steps

### 1. Database Setup ⚠️ **REQUIRED**

- [ ] Log into Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Open `database/calendar_events_schema.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click **RUN** to execute
- [ ] Verify success (no errors shown)

**Verify with:**
```sql
SELECT COUNT(*) FROM team_events;
-- Should return 0 (empty table, ready for data)
```

### 2. Code Verification ✅ **ALREADY COMPLETE**

- [x] CalendarManager.jsx created
- [x] ParentCalendar.jsx created
- [x] calendarExport.js utility created
- [x] App.jsx integration complete
- [x] ParentDashboard.jsx integration complete
- [x] Navigation items updated
- [x] No linter errors

### 3. Test User Accounts

Prepare test accounts:
- [ ] One coach account
- [ ] One parent account with linked swimmers
- [ ] Verify parent has swimmers in a training group

### 4. Feature Testing

#### Coach Tests
- [ ] Log in as coach
- [ ] Navigate to "Calendar" in sidebar
- [ ] Click "+ New Event"
- [ ] Create a test event (all fields)
- [ ] Verify event appears in list
- [ ] Edit the event
- [ ] Verify changes saved
- [ ] Test filter (Upcoming/Past/All)
- [ ] Delete the test event

#### Parent Tests
- [ ] Log in as parent
- [ ] Navigate to "Calendar" tab in dashboard
- [ ] Verify events appear (if any created)
- [ ] Tap an event card
- [ ] Verify detail modal opens
- [ ] Click "Add to Google Calendar"
- [ ] Verify Google Calendar opens with pre-filled data
- [ ] Go back, click "Download for iCal/Outlook"
- [ ] Verify .ics file downloads
- [ ] Open .ics file in calendar app
- [ ] Verify event imports correctly

### 5. Mobile Testing

- [ ] Open on mobile device (or use browser dev tools)
- [ ] Test coach calendar manager
  - [ ] Event creation form scrolls properly
  - [ ] All fields accessible
  - [ ] Buttons are touch-friendly
- [ ] Test parent calendar view
  - [ ] Events display correctly
  - [ ] Cards are tap-friendly
  - [ ] Detail modal is readable
  - [ ] Export buttons work

### 6. Integration Testing

- [ ] Create a meet in Meets Manager
- [ ] Verify meet appears in parent calendar
- [ ] Create a practice in Practice Hub
- [ ] Set it to "scheduled" status
- [ ] Verify practice appears in parent calendar
- [ ] Create a team event in Calendar Manager
- [ ] Verify it appears in parent calendar
- [ ] Test with multiple events of different types

### 7. Security Testing

- [ ] Verify parents can't access Calendar Manager
- [ ] Verify coaches can access Calendar Manager
- [ ] Verify parents only see events for their swimmer's groups
- [ ] Test visibility settings:
  - [ ] Create "coaches_only" event
  - [ ] Verify parents don't see it
  - [ ] Create "parents_only" event
  - [ ] Verify coaches can still manage it

---

## 🚀 Deployment Steps

### Step 1: Deploy Code
```bash
# If using Vercel
git add .
git commit -m "Add calendar feature with event management and export"
git push origin main

# Vercel will auto-deploy
```

### Step 2: Run Database Migration
- [ ] Execute SQL in production Supabase
- [ ] Verify table created successfully
- [ ] Check RLS policies are active

### Step 3: Verify Production
- [ ] Test with production URL
- [ ] Create a real event
- [ ] Test parent export functionality
- [ ] Monitor for errors in console

---

## 📋 Post-Deployment Checklist

### Immediate Actions (Day 1)

- [ ] Create 2-3 sample team events
  - [ ] One social event (Holiday Party, etc.)
  - [ ] One office hours
  - [ ] One team meeting
- [ ] Notify coaches feature is available
- [ ] Send parent announcement about calendar tab
- [ ] Monitor error logs

### First Week Actions

- [ ] Collect feedback from coaches
- [ ] Ask parents if export works
- [ ] Track usage metrics
  - [ ] How many events created?
  - [ ] How many exports performed?
  - [ ] Any errors reported?
- [ ] Address any issues

### First Month Actions

- [ ] Review event types used most
- [ ] Identify any missing features
- [ ] Consider future enhancements
- [ ] Document any bugs or edge cases

---

## 🐛 Common Issues & Fixes

### Issue: Calendar tab not appearing for parents

**Fix:**
1. Check ParentDashboard.jsx has `import ParentCalendar`
2. Verify swimmer has a training group set
3. Check browser console for errors
4. Clear browser cache

### Issue: Events not appearing

**Fix:**
1. Verify database migration ran successfully
2. Check RLS policies are enabled
3. Inspect network tab for failed requests
4. Verify user role is set correctly

### Issue: Export not working

**Fix:**
1. Check browser blocks pop-ups (for Google Calendar)
2. Verify event has required fields (title, date)
3. Test in different browser
4. Check console for JavaScript errors

### Issue: Meets not showing in calendar

**Fix:**
1. Verify meet status is 'open', 'closed', or 'completed'
2. Check meet has start_date set
3. Inspect ParentCalendar.jsx data loading
4. Check browser console for errors

---

## 📊 Success Metrics to Track

### Week 1
- [ ] Number of events created
- [ ] Number of calendar exports
- [ ] User feedback collected

### Month 1
- [ ] Average events per week
- [ ] Export success rate
- [ ] Parent engagement with calendar tab
- [ ] Coach adoption rate

### Ongoing
- [ ] Feature usage trends
- [ ] Error rate
- [ ] User satisfaction
- [ ] Feature requests

---

## 📞 Support Preparation

### Coach Training Needed
- How to create events
- Event type selection
- Target group filtering
- Visibility settings
- When to use external links

### Parent Communication Needed
- Calendar tab location
- How to export events
- What calendar apps are supported
- How often to check for updates

### Documentation to Share
- Link to CALENDAR_FEATURE_GUIDE.md
- Quick reference for common tasks
- Screenshot tutorials (optional)
- FAQ section (build as questions come in)

---

## ✅ Final Pre-Launch Checklist

**Must Complete Before Going Live:**

- [ ] Database schema executed in production
- [ ] Code deployed to production
- [ ] Tested on mobile device
- [ ] Tested with real coach account
- [ ] Tested with real parent account
- [ ] Calendar export verified working
- [ ] Error logging configured
- [ ] Coach training prepared
- [ ] Parent announcement drafted
- [ ] Support documentation ready

**Optional but Recommended:**

- [ ] Create demo video/screenshots
- [ ] Prepare FAQ document
- [ ] Set up usage analytics
- [ ] Create feedback form
- [ ] Plan feature enhancement roadmap

---

## 🎉 Launch Announcement Template

### For Coaches:

> **New Feature: Team Calendar Manager** 🗓️
> 
> You can now create and manage team events directly in StormTracker! 
>
> **Where:** Sidebar → Calendar
>
> **What you can add:**
> - Social events (parties, team dinners)
> - Office hours
> - Team meetings
> - Fundraisers
> - And more!
>
> Parents will see these events in their calendar tab and can easily add them to their personal calendars (Google, iCloud, Outlook).
>
> **Get started:** Log in and click "Calendar" in the sidebar!

### For Parents:

> **New: Team Calendar** 🗓️
> 
> All team activities are now in one place!
>
> **Where to find it:** Parent Dashboard → Calendar tab
>
> **What you'll see:**
> ✓ Upcoming meets
> ✓ Practice schedules (filtered to your swimmer's group)
> ✓ Team events (parties, office hours, etc.)
>
> **Cool feature:** Tap any event to add it directly to your Google Calendar, iPhone, or Outlook! No more manual entry.
>
> **Try it now:** Log in and check out the Calendar tab!

---

## 🎯 Success = 

- [x] Feature deployed without errors
- [ ] At least 5 events created in first week
- [ ] At least 10 parent calendar exports in first week
- [ ] No critical bugs reported
- [ ] Positive feedback from users

---

**Ready to launch? Let's go! 🚀**

