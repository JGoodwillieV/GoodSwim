# Calendar Feature - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `database/calendar_events_schema.sql`
4. Click **Run** to execute the SQL

### Step 2: Verify Installation

The calendar is already integrated into the app! Check:

**For Coaches:**
- Look for "Calendar" in the sidebar navigation
- Click it to access the event manager

**For Parents:**
- Open the parent dashboard
- Look for the "Calendar" tab at the top
- Click it to see all team events

### Step 3: Create Your First Event (Coaches)

1. Navigate to **Calendar** in the sidebar
2. Click **+ New Event**
3. Fill in:
   - Title: "Holiday Party"
   - Type: Social Event
   - Date: Select date
   - Location: "Timberlake House"
4. Click **Create Event**

### Step 4: Test Calendar Export (Parents)

1. Switch to a parent account (or log in as parent)
2. Go to the Calendar tab
3. Tap any event
4. Click **Add to Google Calendar** or **Download for iCal/Outlook**
5. Verify event appears in your personal calendar

## ✅ That's it!

The calendar is now live and ready to use. Your coaches can add events and parents can export them to their personal calendars.

---

## 📱 Parent View Features

Parents will see:
- ✨ **Meets** - Automatically from your meets manager
- 🏊 **Practices** - Filtered to their swimmer's training group
- 🎉 **Team Events** - Social events, office hours, fundraisers, etc.
- 📅 **One-Click Export** - To Google Calendar, iCloud, Outlook

The layout matches the beautiful design from your screenshot - same gradient header, same card style, same mobile-first approach.

---

## 🎯 Coach Features

Coaches can:
- ➕ Create unlimited custom events
- 🎨 Choose from 7 event types (social, office hours, meetings, etc.)
- 👥 Target specific training groups or all swimmers
- 🔒 Control visibility (everyone, parents only, coaches only)
- ✏️ Edit and delete events anytime
- 📋 View upcoming, past, or all events

---

## 🎨 Design Highlights

✓ Matches your existing app style  
✓ Mobile-optimized (most parents use phones)  
✓ Color-coded event types  
✓ Clean, modern interface  
✓ Touch-friendly buttons and cards  

---

## 🔧 Database Tables Created

- `team_events` - Stores custom calendar events
- Indexes for fast queries
- RLS policies for security
- Helper function to combine all event sources

---

## 📚 Need More Help?

See `CALENDAR_FEATURE_GUIDE.md` for:
- Detailed feature documentation
- Troubleshooting tips
- Best practices
- Technical details
- Future enhancement ideas

---

## 🎉 What's Next?

Ideas for future enhancements:
- Recurring events (weekly practices)
- Event reminders via email/push
- RSVP system for social events
- Automatic sync with Google Calendar
- Bulk calendar export

But for now, you have a fully functional calendar system that solves the core need: **Parents can see all team activities in one place and easily add them to their personal calendars!**

