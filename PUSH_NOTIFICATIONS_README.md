# 🔔 StormTracker Push Notifications

Complete push notification system for keeping parents informed about their swimmers' activities.

## 📖 Overview

The StormTracker push notification system enables real-time communication between coaches and parents through native browser push notifications. Parents receive updates about meets, practice changes, test sets, and important announcements directly on their devices.

### Key Features

✅ **Real-time Notifications** - Instant delivery to iOS, Android, and Desktop  
✅ **Badge Counts** - Unread count shown on app icon  
✅ **Granular Preferences** - Parents control what notifications they receive  
✅ **Quiet Hours** - Automatic silencing during specified times  
✅ **Deep Linking** - Notifications navigate to relevant content  
✅ **Cross-Platform** - Works on iOS 16.4+, Android, Chrome, Edge, Safari  

## 🎯 Notification Types

| Type | Trigger | Parent Sees | Default URL |
|------|---------|-------------|-------------|
| **Daily Brief** | Coach creates announcement | "📢 Practice: Practice Cancelled Tomorrow" | `/parent/daily-brief` |
| **Action Items** | Meet confirmation needed | "⚠️ Action Required: Confirm events for County Championships" | `/parent/action-center` |
| **Meet Reminders** | 24-48 hours before meet | "🏊 Meet Reminder: County Championships on Saturday" | `/parent/meets` |
| **Meet Results** | Results uploaded | "🏊 Meet Results Available: County Championships" | `/parent/meets` |
| **Test Set Results** | New test set recorded | "⏱️ New Test Set Results: 400 Free Time Trial" | `/parent/dashboard` |
| **Practice Updates** | Schedule change | "📅 Practice Update: Thursday practice moved to 5pm" | `/parent/calendar` |

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Coach     │         │   Supabase   │         │     Parent      │
│   Action    │────────▶│ Edge Function│────────▶│  Push Service   │
│             │         │  (send-push) │         │  (Browser/OS)   │
└─────────────┘         └──────────────┘         └─────────────────┘
                                │                          │
                                │                          ▼
                        ┌───────▼────────┐        ┌─────────────────┐
                        │   Database     │        │  Parent Device  │
                        │ • Subscriptions│        │  Notification   │
                        │ • Preferences  │        └─────────────────┘
                        │ • Badge Counts │
                        └────────────────┘
```

### Components

1. **Frontend (React)**
   - `usePushNotifications` hook - Manages subscription lifecycle
   - `useBadgeCount` hook - Manages badge counts
   - `NotificationSettings` component - User preferences UI
   - `pushNotifications.js` utility - Helper functions for sending

2. **Service Worker**
   - Handles push events from browser
   - Shows notifications
   - Routes clicks to appropriate pages

3. **Database (Supabase)**
   - `push_subscriptions` - User device subscriptions
   - `notification_preferences` - Per-user settings
   - `user_badge_counts` - Unread notification counts
   - `notification_history` - Audit log

4. **Edge Function (Deno)**
   - `send-push` - Sends notifications using Web Push protocol
   - Respects user preferences and quiet hours
   - Updates badge counts
   - Handles subscription cleanup

## 🚀 Quick Start

### For Developers

See [PUSH_NOTIFICATIONS_QUICK_START.md](./PUSH_NOTIFICATIONS_QUICK_START.md) for 5-minute setup.

### For End Users (Parents)

1. **Install the App**
   - **iOS**: Tap Share → "Add to Home Screen"
   - **Android**: Install via browser prompt or Settings → Install App
   - **Desktop**: Click install icon in address bar

2. **Enable Notifications**
   - Open StormTracker from home screen
   - Tap bell icon (🔔) in sidebar
   - Tap "Enable" button
   - Allow notifications when prompted

3. **Customize Preferences**
   - Choose which notification types to receive
   - Set quiet hours if desired
   - Test with "Send Test Notification"

## 📱 Platform Support

### iOS (Safari 16.4+)

**Requirements:**
- iOS 16.4 or later
- Must be added to home screen first
- Must open from home screen icon

**Limitations:**
- Cannot programmatically trigger install prompt
- Only works as installed PWA
- Notifications appear as "Web App"

### Android (Chrome/Edge)

**Requirements:**
- Chrome 42+ or Edge 17+
- HTTPS (except localhost)

**Features:**
- Full notification support
- Badge API support
- Can install from prompt

### Desktop (Chrome/Edge)

**Requirements:**
- Chrome 42+ or Edge 17+

**Features:**
- All notification features
- Badge API (Windows 10+, macOS Big Sur+)
- Best for development testing

### Not Supported

- Firefox (limited badge support)
- iOS < 16.4
- Internet Explorer
- In-app browsers (Instagram, Facebook)

## 🔧 Configuration

### Frontend Environment Variables

```env
# .env
VITE_VAPID_PUBLIC_KEY=BPX5c1y...your_public_key
```

### Supabase Secrets

```bash
supabase secrets set VAPID_PUBLIC_KEY="BPX5c1y..."
supabase secrets set VAPID_PRIVATE_KEY="aB3dE..."
supabase secrets set VAPID_SUBJECT="mailto:admin@stormtracker.com"
```

## 📝 Usage Examples

### Sending Notifications from Code

#### Daily Brief Notification

```javascript
import { notifyDailyBrief } from './utils/pushNotifications';

// When coach creates announcement
const post = await supabase
  .from('announcements')
  .insert({
    title: 'Practice Cancelled',
    content: 'Due to weather, practice is cancelled tomorrow.',
    type: 'alert'
  })
  .select()
  .single();

// Get all swimmer IDs (or filter by group)
const { data: swimmers } = await supabase
  .from('swimmers')
  .select('id');

const swimmerIds = swimmers.map(s => s.id);

// Send notification to parents
await notifyDailyBrief(post.data, swimmerIds);
```

#### Action Item Notification

```javascript
import { notifyActionRequired } from './utils/pushNotifications';

// When meet needs confirmation
const meet = {
  id: 'meet-123',
  meet_name: 'County Championships'
};

const swimmerIds = ['swimmer-1', 'swimmer-2'];

await notifyActionRequired(meet, swimmerIds);
```

#### Custom Notification

```javascript
import { sendPushNotification, getParentUserIds } from './utils/pushNotifications';

// Get parent user IDs
const parentIds = await getParentUserIds(swimmerIds);

// Send custom notification
await sendPushNotification({
  userIds: parentIds,
  title: '🎉 Season Records Updated',
  body: 'New team records have been set!',
  notificationType: 'meet_results',
  url: '/parent/dashboard',
  tag: 'records-update-2024'
});
```

### Checking Notification Preferences

```javascript
// Check if user wants this notification type
const { data } = await supabase
  .from('notification_preferences')
  .select('daily_brief')
  .eq('user_id', userId)
  .single();

if (data?.daily_brief) {
  // User wants Daily Brief notifications
  await sendNotification(...);
}
```

## 🎨 Customization

### Notification Icons

Icons are located in `public/icons/`:
- `192.png` - Standard notification icon
- `72.png` - Badge icon (monochrome recommended)
- `512.png` - Large icon for some platforms

### Notification Sounds

Browser handles sounds automatically. Custom sounds not supported in Web Push.

### Notification Actions

Add action buttons to notifications:

```javascript
await sendPushNotification({
  userIds: parentIds,
  title: 'Meet Tomorrow',
  body: 'Don\'t forget County Championships tomorrow at 8am',
  notificationType: 'meet_reminders',
  url: '/parent/meets',
  actions: [
    { action: 'view', title: 'View Details' },
    { action: 'dismiss', title: 'Dismiss' }
  ]
});
```

## 🐛 Troubleshooting

### "Permission denied"

**Cause:** User blocked notifications in browser settings

**Fix:**
- Chrome: Settings → Privacy → Site Settings → Notifications
- Safari: Preferences → Websites → Notifications
- Unblock the site and refresh

### "VAPID key not configured"

**Cause:** Environment variable not set or dev server not restarted

**Fix:**
1. Check `.env` has `VITE_VAPID_PUBLIC_KEY`
2. Restart dev server: `npm run dev`
3. Check for typos in key

### Notifications not received

**Checklist:**
- ✅ User enabled notifications in app
- ✅ User granted browser permission
- ✅ Notification type enabled in preferences
- ✅ Not in quiet hours
- ✅ Push subscription exists in database
- ✅ Edge Function deployed

**Debug:**
```sql
-- Check subscription
SELECT * FROM push_subscriptions WHERE user_id = 'user-uuid';

-- Check preferences
SELECT * FROM notification_preferences WHERE user_id = 'user-uuid';

-- Check notification history
SELECT * FROM notification_history 
WHERE user_id = 'user-uuid' 
ORDER BY sent_at DESC LIMIT 10;
```

### iOS notifications not working

**Checklist:**
- ✅ iOS 16.4 or later
- ✅ App added to home screen
- ✅ Opening from home screen icon (not browser)
- ✅ Granted permission after opening from home screen

### Badge not updating

**Cause:** Badge API only works for installed PWAs

**Fix:**
- Ensure app is installed (added to home screen)
- Check browser supports Badge API
- Desktop: Install PWA from browser prompt

## 📊 Monitoring

### View Notification Stats

```sql
-- Total sent
SELECT COUNT(*) FROM notification_history;

-- By type
SELECT notification_type, COUNT(*) 
FROM notification_history 
GROUP BY notification_type;

-- Recent sends
SELECT * FROM notification_history 
ORDER BY sent_at DESC 
LIMIT 20;

-- Active subscriptions
SELECT COUNT(DISTINCT user_id) FROM push_subscriptions;
```

### Edge Function Logs

```bash
supabase functions logs send-push
```

### Clean Up Old Subscriptions

```sql
-- Find old subscriptions
SELECT * FROM push_subscriptions 
WHERE last_used_at < NOW() - INTERVAL '90 days';

-- Delete them
DELETE FROM push_subscriptions 
WHERE last_used_at < NOW() - INTERVAL '90 days';
```

## 🔐 Security

### Best Practices

1. **Never expose VAPID private key** - only in Supabase secrets
2. **Use HTTPS in production** - required for push
3. **Validate permissions** - RLS policies enforced
4. **Rate limit** - avoid notification spam
5. **Respect preferences** - honor quiet hours and opt-outs
6. **Allow unsubscribe** - easy opt-out in settings

### RLS Policies

All tables have Row Level Security enabled:
- Users can only manage their own subscriptions
- Users can only see their own preferences
- Users can only view their own notification history

## 📚 Resources

- **Setup Guide:** [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md)
- **Quick Start:** [PUSH_NOTIFICATIONS_QUICK_START.md](./PUSH_NOTIFICATIONS_QUICK_START.md)
- **Edge Function:** [supabase/functions/send-push/README.md](./supabase/functions/send-push/README.md)
- **Web Push Protocol:** https://web.dev/push-notifications-overview/
- **Supabase Docs:** https://supabase.com/docs/guides/functions
- **Browser Support:** https://caniuse.com/push-api

## 🚧 Roadmap

Future enhancements:
- [ ] Rich notifications with images
- [ ] Notification scheduling (send at specific time)
- [ ] Notification groups (category grouping)
- [ ] Analytics dashboard
- [ ] A/B testing for notification content
- [ ] Push-to-refresh background sync
- [ ] Custom notification sounds (if API available)

## 🤝 Contributing

When adding new notification triggers:

1. Add notification type to preferences schema
2. Update `NotificationSettings.jsx` with new toggle
3. Create helper function in `pushNotifications.js`
4. Call helper from trigger point in code
5. Test across platforms
6. Update documentation

## 💬 Support

**Issues?**
1. Check [Troubleshooting](#troubleshooting) section
2. Review Edge Function logs
3. Test with "Send Test Notification" button
4. Check browser console for errors

**Questions?**
- Review database schema comments
- Check Edge Function implementation
- Test locally with `supabase functions serve`

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Requires:** StormTracker v2.0+, Supabase Edge Functions

