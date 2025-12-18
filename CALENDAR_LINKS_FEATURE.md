# Calendar Multiple Links Feature

## Overview

Calendar events now support multiple custom links instead of just one "external link". This allows coaches to add separate links for different purposes (RSVP, sign-ups, directions, etc.).

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Add new column for multiple links
ALTER TABLE team_events 
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';

-- Migrate existing external_link data to new links format
UPDATE team_events 
SET links = jsonb_build_array(
  jsonb_build_object(
    'title', 'More Information',
    'url', external_link
  )
)
WHERE external_link IS NOT NULL AND external_link != '';
```

## Data Format

Links are stored as a JSONB array:

```json
[
  {
    "title": "RSVP",
    "url": "https://signupgenius.com/go/12345"
  },
  {
    "title": "Chaperone Sign Up",
    "url": "https://forms.google.com/form/67890"
  },
  {
    "title": "Directions",
    "url": "https://maps.google.com/?q=venue"
  }
]
```

## Coach Interface

### Creating/Editing Events

In the event form modal:

1. Scroll to "Contact & Additional Info" section
2. Click **"+ Add Link"** button
3. Enter:
   - **Link Title**: Short descriptive name (e.g., "RSVP", "Sign Up", "Directions")
   - **URL**: Full web address starting with `https://`
4. Click **"+ Add Link"** again to add more links
5. Click **X** button to remove a link
6. Empty links (missing title or URL) are automatically filtered out when saving

### Event Card Preview

On the calendar manager list view:
- Shows first 2 links with icons
- Shows "+X more" if there are additional links
- Links are clickable directly from the card

## Parent Interface

### Event Detail Modal

When parents tap an event:
- All links are displayed in a "Links" section
- Each link shows with the custom title
- Links open in a new tab/window
- Links appear above the "Add to Calendar" buttons

### Backwards Compatibility

- Events with the old `external_link` field still work
- They show as "More Information" if no new links exist
- Migrating to the new format is automatic when you edit the event

## Use Cases

### Example 1: Holiday Party
```
Links:
- "RSVP" → SignUpGenius form
- "White Elephant Rules" → Google Doc
- "Directions" → Google Maps
```

### Example 2: Fundraiser
```
Links:
- "Registration" → Event registration form
- "Donate" → Donation page
- "Volunteer Sign Up" → Volunteer schedule
- "More Information" → Event website
```

### Example 3: Office Hours
```
Links:
- "Schedule Appointment" → Calendly/booking link
- "Virtual Meeting Link" → Zoom/Google Meet
```

### Example 4: Team Meeting
```
Links:
- "Meeting Agenda" → Google Doc
- "Join Zoom" → Zoom meeting link
- "Submit Questions" → Google Form
```

## Technical Details

### Component Changes

**CalendarManager.jsx:**
- Added `links` array to form state
- Added `handleAddLink()`, `handleRemoveLink()`, `handleUpdateLink()` functions
- UI for managing multiple links with title/URL inputs
- Filters out empty links before saving
- Shows links preview on event cards

**ParentCalendar.jsx:**
- Updated EventDetailModal to show all links
- Each link displays with its custom title
- Backwards compatible with old `external_link` field

### Validation

- Links are optional
- Empty links (no title or no URL) are automatically removed
- URL format is validated by browser (type="url")
- No limit on number of links (but UI shows first 2 on cards)

## Migration Notes

### For Existing Events

The SQL migration automatically converts existing `external_link` values to the new `links` format with the title "More Information".

### For New Events

Use the new links interface. The old `external_link` field is kept for backwards compatibility but not shown in the UI.

### Editing Old Events

When you edit an event that has the old `external_link`:
- It will be preserved in the database
- You can add new links using the links interface
- Once you save with new links, they take precedence

## User Experience

### Coach Benefits
- More organized event information
- Clear, specific link labels
- Easy to manage multiple resources
- Preview links on calendar cards

### Parent Benefits
- Clear understanding of what each link does
- All resources in one place
- No confusion about "external link" purpose
- Mobile-friendly tap targets

## Future Enhancements

Potential additions:
- Link icons based on URL (Google Docs, Zoom, etc.)
- Link click tracking/analytics
- Link preview/thumbnails
- Link categories/grouping
- Quick link templates (RSVP, Sign Up, etc.)
- Bulk add links from clipboard

## Troubleshooting

### Links not saving
- Check that both title and URL are filled in
- Verify URL starts with http:// or https://
- Check browser console for errors

### Links not showing for parents
- Verify links were saved (check database)
- Ensure event is visible to parents
- Check that links array is not empty

### Migration didn't work
- Check if `external_link` had values
- Verify links column exists
- Re-run migration SQL if needed

## Status

✅ **Complete and deployed!**

- [x] Database schema updated
- [x] Coach UI implemented
- [x] Parent UI implemented
- [x] Migration script created
- [x] Backwards compatibility maintained
- [x] Documentation complete

