# Parent Messages UI Fixes

## Issues Fixed

### 1. Email Address Showing Instead of Name
**Problem:** Announcements were showing the coach's email address (e.g., "james.goodwillie@gmail.com") instead of their name.

**Root Cause:** 
- When coaches created announcements without a `display_name` in their user profile, the system was storing the full email address as the author name
- The display logic wasn't cleaning up email addresses in existing announcements

**Solution Implemented:**

#### A. Improved Author Name Logic in AnnouncementComposer (`src/AnnouncementComposer.jsx`)
- Enhanced the author name determination logic to:
  1. First try to use the user's `display_name` from their profile
  2. If no display name exists, extract the name from email (part before @)
  3. Format the extracted name: replace dots/underscores/dashes with spaces and capitalize each word
  4. Example: "james.goodwillie@gmail.com" → "James Goodwillie"
  5. Fallback to "Coach" if no email is available

```javascript
// Determine author name - never show full email
let authorName = 'Coach';
if (profile?.display_name && profile.display_name.trim()) {
  authorName = profile.display_name.trim();
} else if (user.email) {
  // Extract name from email (part before @)
  authorName = user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
```

#### B. Added Display Name Cleanup in DailyBrief (`src/DailyBrief.jsx`)
- Created a `getDisplayName()` helper function that cleans up author names on display
- Handles existing announcements that have email addresses stored
- Applies the same formatting logic: extracts name from email and formats nicely
- Updated all announcement card types (urgent and regular) to use this function

---

### 2. No Unread Badge on Messages Tab
**Problem:** The Messages navigation item had no visual indicator for unread messages, making it easy to miss new announcements.

**Solution Implemented:**

#### A. Updated ParentMobileNav (`src/components/navigation/ParentMobileNav.jsx`)
- Implemented real-time unread count fetching
- Queries the database to count announcements that:
  - Are not expired
  - Have not been read by the current user
- Displays a red badge with the unread count
- Shows "9+" if more than 9 unread messages
- **Auto-refreshes every 10 seconds** for quick updates
- **Also refreshes when navigating between tabs** to immediately update after reading messages

#### B. Updated ParentSidebar (`src/components/navigation/ParentSidebar.jsx`)
- Implemented the same unread count logic for desktop view
- Displays red badge with count next to "Messages" label
- **Auto-refreshes every 10 seconds** for quick updates
- **Also refreshes when navigating between tabs** to immediately update after reading messages

**Features:**
- ✅ Red circular badge on Messages tab when there are unread messages
- ✅ Shows the exact count (e.g., "3") or "9+" for 10 or more
- ✅ Updates automatically every 10 seconds without page refresh
- ✅ **Instant update when switching tabs** (no need to wait for polling)
- ✅ Works on both mobile (bottom nav) and desktop (sidebar)
- ✅ Badge disappears when all messages are read

---

## Files Modified

1. **src/AnnouncementComposer.jsx**
   - Enhanced author name logic to never store full email addresses

2. **src/DailyBrief.jsx**
   - Added `getDisplayName()` helper to clean up email addresses
   - Updated all author name displays to use the helper

3. **src/components/navigation/ParentMobileNav.jsx**
   - Implemented unread count query
   - Added auto-refresh polling

4. **src/components/navigation/ParentSidebar.jsx**
   - Implemented unread count query
   - Added auto-refresh polling

---

## Visual Changes

### Before:
- Author shown as: "james.goodwillie@gmail.com"
- No indication of unread messages on nav bar

### After:
- Author shown as: "James Goodwillie" (nicely formatted)
- Red badge with count appears on Messages tab when there are unread messages
- Badge shows number (1-9) or "9+" for 10 or more unread

---

## Technical Details

### Database Queries
The unread count is calculated by:
1. Fetching all non-expired announcements
2. Fetching all announcement reads for the current user
3. Comparing to find which announcements haven't been read
4. Counting the unread announcements

### Performance
- Queries are lightweight (only selecting IDs)
- Auto-refresh polls every 10 seconds for responsive updates
- Additional refresh triggers when user navigates between tabs
- Badge updates happen in the background without affecting UI performance
- Two refresh mechanisms ensure the badge is always up-to-date:
  1. **Polling**: Every 10 seconds (catches new announcements from coaches)
  2. **Tab navigation**: When switching tabs (catches messages you just read)

---

## Troubleshooting & Known Issues

### Issue: Badge doesn't appear immediately after announcement is published
**Cause:** The badge updates via polling (every 10 seconds) and when switching tabs.

**Solution (Applied):**
- Reduced polling interval from 30 seconds to 10 seconds
- Added tab navigation trigger to refresh count immediately when switching tabs
- This ensures the badge appears within 10 seconds maximum, or immediately when you switch tabs

**Expected Behavior Now:**
1. Coach publishes announcement
2. Parent's badge updates within 10 seconds automatically
3. OR parent switches tabs (Home → Schedule → Home) and badge updates immediately

### Issue: Badge shows wrong count after reading messages
**Cause:** Badge wasn't updating when returning from Messages tab.

**Solution (Applied):**
- Added `useEffect` hook that monitors the `activeTab` prop
- When user navigates away from the Messages/notifications tab, the badge refreshes
- This ensures accurate counts after reading messages

---

## Testing Recommendations

1. **Test Author Names:**
   - Create a new announcement as a coach
   - Verify the author name shows properly formatted (not as email)
   - Check existing announcements also show formatted names

2. **Test Unread Badges:**
   - As a parent, view the Messages tab
   - Mark some messages as read by opening them
   - Verify the badge count decreases
   - Navigate away and back - badge should persist
   - Wait 30 seconds and create a new announcement - badge should update automatically

3. **Test on Different Devices:**
   - Mobile: Check bottom navigation bar badge
   - Desktop: Check sidebar badge
   - Both should show the same count

---

## Future Enhancements (Optional)

1. **Real-time Updates:** Consider using Supabase real-time subscriptions instead of polling for instant updates
2. **User Profile Management:** Add a settings page where users can update their display name
3. **Announcement Categories:** Add filtering by urgent/important messages
4. **Push Notifications:** Integrate with the existing push notification system to alert users of new announcements

