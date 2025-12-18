# Parent Messages Attachments Fix

## Issue
Links and PDF attachments added by coaches/staff to announcements were not displaying in the Parent Dashboard Messages section.

## Root Cause
1. The `loadAnnouncements` function in `DailyBrief.jsx` was not fetching the attachment fields from the database
2. The `AnnouncementCard` component had no rendering logic to display links or file attachments

## Solution Implemented

### 1. Updated Database Query
Added the following fields to the announcements query in `DailyBrief.jsx`:
- `link_url`
- `link_title`
- `attachment_url`
- `attachment_filename`
- `attachment_type`

### 2. Added Icon Imports
Imported `Link2` and `FileText` icons from lucide-react for displaying attachments.

### 3. Created Attachment Renderer
Added a `renderAttachments()` helper function inside `AnnouncementCard` that:
- Checks if the announcement has a link or file attachment
- Renders clickable buttons/links for each attachment type
- Handles different styling for urgent vs. regular announcements
- Prevents event propagation so clicking attachments doesn't expand/collapse the card
- Provides fallback text if titles/filenames are missing

### 4. Integrated Attachment Display
Added the attachment renderer to all three announcement card types:
- **Urgent announcements**: White text/icons on semi-transparent background
- **Pinned announcements**: Standard styling with blue accents
- **Regular announcements**: Standard styling with blue accents

## Features
- ✅ Links display with a link icon and customizable title
- ✅ File attachments display with a file icon and filename
- ✅ Both open in new tabs when clicked
- ✅ Styled consistently with the rest of the UI
- ✅ Works across all announcement types (urgent, pinned, regular)
- ✅ Hover effects for better UX
- ✅ Proper click handling to prevent card expansion when clicking attachments

## Files Modified
- `src/DailyBrief.jsx` - Updated to fetch and display attachments

## Testing
To test the fix:
1. As a coach/staff member, create an announcement and add:
   - A link (with optional custom title)
   - A PDF or other file attachment
2. As a parent, navigate to the Dashboard and view the Messages section
3. Verify that:
   - The link appears with an icon and title
   - The file attachment appears with an icon and filename
   - Clicking them opens in a new tab
   - They display correctly for urgent, pinned, and regular announcements

## Database Schema
The fix assumes the following columns exist in the `announcements` table (created via `announcements_add_attachments.sql`):
- `link_url` (TEXT)
- `link_title` (TEXT)
- `attachment_url` (TEXT)
- `attachment_filename` (TEXT)
- `attachment_type` (TEXT)

If these columns don't exist, run the SQL migration:
```bash
# In Supabase SQL Editor, run:
database/announcements_add_attachments.sql
```

