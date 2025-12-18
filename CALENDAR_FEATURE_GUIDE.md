# Calendar Feature Guide

## Overview

The StormTracker calendar feature provides a unified view of all team activities including:
- **Swim Meets** - Automatically pulled from the meets manager
- **Practices** - Scheduled practices filtered by swimmer's training group
- **Team Events** - Custom events created by coaches (social events, office hours, fundraisers, etc.)

Parents can view all events in one place and easily add them to their personal calendars (Google Calendar, iCloud, Outlook, etc.).

## Key Features

### For Coaches

1. **Create Custom Team Events**
   - Social events (holiday parties, team dinners)
   - Office hours
   - Team meetings
   - Fundraisers
   - Volunteer opportunities
   - Other custom events

2. **Event Management**
   - Full date/time control (all-day or timed events)
   - Multi-day event support
   - Location information with addresses
   - Target specific training groups or all swimmers
   - Control visibility (everyone, parents only, coaches only)
   - Add contact information and external links
   - Edit and delete events as needed

3. **Event Details**
   - Title and description
   - Event type categorization
   - Start/end dates and times
   - Location with address
   - Contact person with email/phone
   - External links (registration, more info)
   - Target audience selection

### For Parents

1. **Unified Calendar View**
   - See all meets, practices, and team events in one place
   - Events automatically filtered by swimmer's training group
   - Clean, mobile-optimized interface
   - Events grouped by month
   - Color-coded by event type

2. **Calendar Export**
   - **Add to Google Calendar** - One-click button opens Google Calendar with pre-filled event
   - **Download .ics File** - Works with Apple Calendar, Outlook, and other calendar apps
   - All event details automatically included (time, location, description)

3. **Event Details**
   - Tap any event to see full details
   - View location, time, contact info
   - Access external links for registration or more info
   - Quick export to personal calendar

## Setup Instructions

### 1. Database Setup

Run the calendar schema in your Supabase SQL Editor:

```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: database/calendar_events_schema.sql
```

This creates:
- `team_events` table for custom events
- Indexes for efficient querying
- Row-level security policies
- Function to combine all calendar sources

### 2. Verify Integration

The calendar is automatically integrated into:
- **Coach View**: Sidebar navigation → "Calendar"
- **Parent View**: Dashboard tabs → "Calendar" tab

## Using the Calendar

### Creating Events (Coaches)

1. Navigate to **Calendar** in the sidebar
2. Click **+ New Event**
3. Fill in event details:
   - **Title**: Event name (required)
   - **Type**: Select event category
   - **Description**: Event details
   - **Date/Time**: Set start/end dates and times
   - **All-day event**: Toggle if event has no specific time
   - **Location**: Venue name and address
   - **Target Groups**: Select which training groups should see this (empty = all)
   - **Visibility**: Choose who can see this event
   - **Contact Info**: Add contact person and details
   - **External Link**: Add registration or info links
4. Click **Create Event**

### Managing Events (Coaches)

- **Edit**: Click the three-dot menu on any event card → Edit
- **Delete**: Click the three-dot menu → Delete
- **Filter**: View Upcoming, Past, or All events
- Events are displayed in date order with color coding

### Viewing Calendar (Parents)

1. Navigate to **Calendar** tab in parent dashboard
2. Browse events by month
3. Tap any event to see details
4. Use filters to view Upcoming or Past events

### Adding to Personal Calendar (Parents)

1. Tap an event to open details
2. Choose export option:
   - **Add to Google Calendar**: Opens Google Calendar with event pre-filled
   - **Download for iCal/Outlook**: Downloads .ics file that works with:
     - Apple Calendar (iPhone, iPad, Mac)
     - Microsoft Outlook
     - Yahoo Calendar
     - Any calendar app that supports .ics files
3. The event is now in your personal calendar with all details

## Event Types & Icons

The calendar uses color-coded icons for different event types:

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| **Meet** | Trophy | Blue | Swim competitions |
| **Practice** | Waves | Amber | Training sessions |
| **Social** | Heart | Purple | Parties, gatherings |
| **Office Hours** | Clock | Emerald | Coach availability |
| **Team Meeting** | Users | Slate | Group meetings |
| **Fundraiser** | Dollar | Green | Fundraising events |
| **Volunteer** | Heart | Pink | Community service |
| **Other** | Calendar | Gray | Miscellaneous |

## Data Flow

### Event Sources

The calendar combines data from three sources:

1. **Meets Table** (`meets`)
   - Automatically included if status is open, closed, or completed
   - Shows meet name, dates, and location
   - All swimmers see meets

2. **Practices Table** (`practices`)
   - Only shows scheduled practices
   - Filtered by swimmer's training group
   - Shows practice title, date, and time

3. **Team Events Table** (`team_events`)
   - Custom events created by coaches
   - Filtered by target groups (if specified)
   - Respects visibility settings

### Filtering Logic

**For Parents:**
- Events are filtered by swimmer's training group(s)
- If a parent has multiple swimmers in different groups, they see events for all groups
- Events with no target group (empty array) are shown to everyone

**For Coaches:**
- All events are visible regardless of target groups

## Mobile Optimization

The calendar is specifically optimized for mobile use:

- **Touch-friendly**: Large tap targets for events
- **Responsive Layout**: Adapts to all screen sizes
- **Swipe-friendly**: Smooth scrolling through events
- **Modal Details**: Full-screen event details on mobile
- **Bottom Sheets**: Calendar export options optimized for mobile
- **Grouped by Month**: Easy to scan and navigate

## Technical Details

### Database Schema

```sql
team_events table:
- id (UUID, Primary Key)
- title (VARCHAR, Required)
- description (TEXT)
- event_type (VARCHAR, Enum)
- start_date (DATE, Required)
- end_date (DATE, Optional)
- start_time (TIME, Optional)
- end_time (TIME, Optional)
- all_day (BOOLEAN)
- location_name (VARCHAR)
- location_address (TEXT)
- target_groups (TEXT[], Array)
- visible_to (VARCHAR, Enum)
- contact_name, contact_email, contact_phone
- external_link (TEXT)
- created_by (UUID, Foreign Key)
- created_at, updated_at (TIMESTAMP)
```

### Calendar Export Format

The calendar export uses the **iCalendar (.ics)** standard format, which is universally supported:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StormTracker//Calendar Export//EN
BEGIN:VEVENT
UID:[unique-id]
SUMMARY:[Event Title]
DESCRIPTION:[Event Description]
LOCATION:[Location]
DTSTART:[Start Date/Time]
DTEND:[End Date/Time]
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

### Components

- **CalendarManager.jsx** - Coach event management interface
- **ParentCalendar.jsx** - Parent calendar view with export
- **calendarExport.js** - Utility for generating .ics files and calendar URLs
- **calendar_events_schema.sql** - Database schema and functions

## Security

### Row-Level Security (RLS)

The calendar respects these security rules:

1. **Read Access**:
   - Everyone can view events with `visible_to = 'everyone'`
   - Only parents can view `visible_to = 'parents_only'` events
   - Only coaches can view `visible_to = 'coaches_only'` events

2. **Write Access**:
   - Only authenticated coaches can create, update, or delete events
   - Events are tied to the coach who created them (`created_by`)

3. **Data Privacy**:
   - Parents only see events relevant to their swimmer's groups
   - Meets and practices follow their own RLS policies
   - No cross-contamination between teams

## Best Practices

### For Coaches

1. **Use Descriptive Titles**: Make event names clear and specific
2. **Add Locations**: Always include venue name and address for in-person events
3. **Set Target Groups**: Filter events to relevant groups to avoid clutter
4. **Include Contact Info**: Make it easy for parents to ask questions
5. **Use External Links**: Link to registration forms, maps, or more information
6. **Update Regularly**: Remove or mark completed events as past

### For Parents

1. **Sync to Personal Calendar**: Export events you need to remember
2. **Check Regularly**: New events may be added at any time
3. **Review Event Details**: Tap events to see full information
4. **Note Target Groups**: Events may be specific to your swimmer's group

## Troubleshooting

### Events Not Appearing

1. **Check Database**: Verify `team_events` table exists
   ```sql
   SELECT * FROM team_events LIMIT 5;
   ```

2. **Verify RLS Policies**: Ensure policies are enabled
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'team_events';
   ```

3. **Check User Role**: Ensure user has correct role (coach/parent)
4. **Inspect Console**: Look for JavaScript errors in browser console

### Calendar Export Not Working

1. **Check Browser**: Ensure pop-ups are not blocked
2. **Verify Event Data**: Make sure event has required fields (title, date)
3. **Test .ics Download**: Should work in all modern browsers
4. **Google Calendar Issues**: Ensure user is logged into Google account

### Calendar Not Showing for Coaches

1. **Check App.jsx**: Verify `CalendarManager` is imported
2. **Check Sidebar**: Ensure "Calendar" appears in navigation
3. **Check Route**: View should be set to 'calendar'
4. **Clear Cache**: Try hard refresh (Ctrl+Shift+R)

## Future Enhancements

Potential additions to the calendar feature:

1. **Recurring Events** - Support for weekly practices, monthly meetings
2. **Event Reminders** - Email/push notifications before events
3. **RSVP System** - Track attendance for social events
4. **Calendar Sync** - Automatic synchronization with Google Calendar API
5. **Meet Warmup Times** - Pull session times from meet timeline
6. **Practice Notes** - Link practices to practice sets in Practice Hub
7. **Event Photos** - Attach photos after events complete
8. **Calendar Sharing** - Share team calendar via public URL
9. **Bulk Export** - Download entire month or season at once
10. **Holiday Markers** - Automatically mark school holidays

## Support

For issues or questions about the calendar feature:

1. Check this guide first
2. Review the database schema
3. Inspect browser console for errors
4. Check Supabase logs for database issues
5. Test with different user roles (coach vs parent)

## Version History

- **v1.0** (Dec 2025) - Initial release
  - Team events management for coaches
  - Unified calendar view for parents
  - Google Calendar integration
  - .ics export for all calendar apps
  - Mobile-optimized interface
  - Group-based filtering
  - Visibility controls

