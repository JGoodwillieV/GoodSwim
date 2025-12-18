# 🔔 StormTracker Push Notifications Setup Guide

Complete guide to enable push notifications for parent accounts in StormTracker.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Generate VAPID Keys](#step-1-generate-vapid-keys)
- [Step 2: Database Setup](#step-2-database-setup)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Deploy Edge Function](#step-4-deploy-edge-function)
- [Step 5: Test Notifications](#step-5-test-notifications)
- [Troubleshooting](#troubleshooting)
- [Platform-Specific Notes](#platform-specific-notes)

---

## Overview

The push notification system allows coaches to send real-time notifications to parents about:
- 📢 Daily Brief announcements
- ⚠️ Action items (meet confirmations, forms)
- 🏊 Meet reminders and results
- ⏱️ Test set results
- 📅 Practice schedule changes

**Key Features:**
- ✅ Works on iOS 16.4+, Android, Desktop Chrome/Edge
- ✅ Badge counts on app icon
- ✅ Quiet hours support
- ✅ Per-notification-type preferences
- ✅ Respects user preferences

---

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 16+ installed
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Supabase project with admin access
- ✅ StormTracker repository cloned locally

---

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push protocol.

### Generate Keys

Run this command in your project root:

```bash
npx web-push generate-vapid-keys
```

**Expected Output:**
```
=======================================
Public Key:
BPX5c1ygFJ...YOUR_PUBLIC_KEY...k7QEaGpA

Private Key:
aB3dE...YOUR_PRIVATE_KEY...xyz123
=======================================
```

### ⚠️ Important Security Notes

- **NEVER** commit your private key to version control
- Store both keys securely (password manager recommended)
- If keys are compromised, regenerate and redeploy everywhere

---

## Step 2: Database Setup

### Run the Schema Migration

1. **Navigate to your project:**
   ```bash
   cd StormTracker
   ```

2. **Run the migration:**
   ```bash
   supabase db push database/push_notifications_schema.sql
   ```
   
   **Or manually via Supabase Dashboard:**
   - Go to https://app.supabase.com
   - Select your project
   - Go to SQL Editor
   - Copy/paste contents of `database/push_notifications_schema.sql`
   - Click "Run"

### Verify Tables Created

Check that these tables exist in your database:
- ✅ `push_subscriptions`
- ✅ `notification_preferences`
- ✅ `user_badge_counts`
- ✅ `notification_history`

### Verify Functions Created

Check that these functions exist:
- ✅ `increment_badge_counts(user_ids UUID[])`
- ✅ `clear_badge_count(p_user_id UUID)`
- ✅ `should_send_notification(p_user_id UUID, p_notification_type TEXT)`

---

## Step 3: Configure Environment Variables

### Frontend Environment Variables

Create or update `.env` in your project root:

```env
# VAPID Public Key (from Step 1)
VITE_VAPID_PUBLIC_KEY=BPX5c1ygFJ...YOUR_PUBLIC_KEY...k7QEaGpA
```

### Supabase Secrets (for Edge Function)

Set these secrets in Supabase:

```bash
# Set VAPID keys
supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:your-email@stormtracker.com"
```

**Alternative: Via Supabase Dashboard**
1. Go to Project Settings → Edge Functions → Secrets
2. Add the three secrets manually

### Verify Secrets Set

```bash
supabase secrets list
```

Should show:
```
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

---

## Step 4: Deploy Edge Function

### Test Locally First

```bash
# Start Supabase locally
supabase start

# Serve the function
supabase functions serve send-push

# In another terminal, test it
curl -X POST http://localhost:54321/functions/v1/send-push \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["test-user-id"],
    "title": "Test Notification",
    "body": "This is a test",
    "notification_type": "daily_brief"
  }'
```

### Deploy to Production

```bash
supabase functions deploy send-push
```

### Verify Deployment

```bash
supabase functions list
```

Should show `send-push` with status "Active"

---

## Step 5: Test Notifications

### 5.1 Test Push Subscription

1. **Open StormTracker as a parent**
2. **Navigate to:** Notifications (bell icon in sidebar)
3. **Click:** "Enable" button
4. **Allow notifications** when browser prompts
5. **Click:** "Send Test Notification"
6. **Verify:** You receive a test notification

### 5.2 Test Daily Brief Notification

1. **Login as coach**
2. **Create a Daily Brief announcement**
3. **Verify:** Parents receive notification
4. **Check:** Badge count increments on parent's app icon

### 5.3 Test Badge Clearing

1. **Open app as parent**
2. **Navigate to:** Notifications
3. **Badge should clear automatically**

### 5.4 Test Quiet Hours

1. **As parent, set quiet hours** (e.g., 10 PM - 7 AM)
2. **As coach, send announcement during quiet hours**
3. **Verify:** Parent does NOT receive notification
4. **Send announcement outside quiet hours**
5. **Verify:** Parent DOES receive notification

---

## Troubleshooting

### Issue: "VAPID key not configured"

**Solution:**
- Verify `.env` file exists and contains `VITE_VAPID_PUBLIC_KEY`
- Restart your dev server (`npm run dev`)
- Check for typos in the key

### Issue: "Permission denied by user"

**Solution:**
- User blocked notifications in browser settings
- **Chrome/Edge:** Go to Site Settings → Notifications → Allow
- **Safari:** Go to Safari → Settings → Websites → Notifications

### Issue: "Push notifications not supported"

**Causes:**
- Using HTTP instead of HTTPS (production only works on HTTPS)
- Browser doesn't support push (Firefox Focus, some mobile browsers)
- iOS: App not added to home screen

**Solutions:**
- Deploy to HTTPS domain
- Use supported browser
- On iOS: Add to home screen first, THEN enable notifications

### Issue: Edge Function Returns 500

**Debug steps:**
1. Check Edge Function logs:
   ```bash
   supabase functions logs send-push
   ```

2. Verify secrets are set:
   ```bash
   supabase secrets list
   ```

3. Check database connection in Edge Function

### Issue: Notifications Not Received

**Checklist:**
- ✅ User has granted notification permission
- ✅ User has enabled this notification type in preferences
- ✅ Not in quiet hours
- ✅ Push subscription exists in database
- ✅ Edge Function deployed successfully
- ✅ VAPID keys match between frontend and backend

**Debug:**
```sql
-- Check if user has subscription
SELECT * FROM push_subscriptions WHERE user_id = 'USER_UUID';

-- Check notification preferences
SELECT * FROM notification_preferences WHERE user_id = 'USER_UUID';

-- Check notification history
SELECT * FROM notification_history WHERE user_id = 'USER_UUID' ORDER BY sent_at DESC;
```

### Issue: Badge Not Updating

**Solution:**
- Badge API only works on installed PWAs
- Ensure app is added to home screen (iOS/Android)
- Desktop: Install PWA via browser's install prompt

---

## Platform-Specific Notes

### iOS (Safari)

**Requirements:**
- iOS 16.4 or later
- App MUST be added to home screen first
- Notifications only work for installed PWA

**Installation Flow:**
1. Open StormTracker in Safari
2. Tap Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"
5. Open app from home screen
6. Enable notifications in app

**Limitations:**
- Cannot trigger install prompt programmatically
- Must be on HTTPS
- Notifications appear as "Web App" notifications

### Android (Chrome)

**Requirements:**
- Chrome 42+ or Edge 17+
- HTTPS required (except localhost)

**Features:**
- ✅ Full push notification support
- ✅ Badge API support
- ✅ Background sync
- ✅ Can install from banner or settings

### Desktop (Chrome/Edge)

**Requirements:**
- Chrome 42+ or Edge 17+

**Features:**
- ✅ All notification features supported
- ✅ Badge API (Windows 10/11, macOS Big Sur+)
- ✅ Best for testing during development

### Not Supported

- ❌ Firefox (no badge API support)
- ❌ Older iOS versions (< 16.4)
- ❌ Internet Explorer
- ❌ Some in-app browsers (Instagram, Facebook)

---

## Notification Types Reference

Use these values in `notification_type` field:

| Type | Description | Default URL |
|------|-------------|-------------|
| `daily_brief` | Daily Brief announcements | `/parent/daily-brief` |
| `action_items` | Action Center tasks | `/parent/action-center` |
| `meet_reminders` | Upcoming meet reminders | `/parent/meets` |
| `meet_results` | New meet results | `/parent/meets` |
| `test_set_results` | Test set recordings | `/parent/dashboard` |
| `practice_updates` | Practice schedule changes | `/parent/calendar` |

---

## Code Examples

### Trigger Notification from Code

```javascript
import { notifyDailyBrief } from './utils/pushNotifications';

// When creating a Daily Brief post
const post = {
  id: 'post-123',
  type: 'practice',
  title: 'Practice Cancelled Tomorrow',
  content: 'Due to weather...'
};

const swimmerIds = ['swimmer-1', 'swimmer-2'];

await notifyDailyBrief(post, swimmerIds);
```

### Send Custom Notification

```javascript
import { sendPushNotification } from './utils/pushNotifications';

await sendPushNotification({
  userIds: ['user-1', 'user-2'],
  title: '🎉 Season Records Updated',
  body: 'Check out the new team records!',
  notificationType: 'meet_results',
  url: '/parent/dashboard',
  tag: 'records-update'
});
```

### Get Parent User IDs

```javascript
import { getParentUserIds } from './utils/pushNotifications';

const swimmerIds = ['swimmer-1', 'swimmer-2'];
const parentIds = await getParentUserIds(swimmerIds);
// Returns: ['parent-1', 'parent-2']
```

---

## Monitoring & Analytics

### Check Notification Stats

```sql
-- Total notifications sent
SELECT COUNT(*) FROM notification_history;

-- Notifications by type
SELECT notification_type, COUNT(*) 
FROM notification_history 
GROUP BY notification_type;

-- Click-through rate
SELECT 
  notification_type,
  COUNT(*) as sent,
  COUNT(clicked_at) as clicked,
  ROUND(COUNT(clicked_at)::numeric / COUNT(*) * 100, 2) as ctr
FROM notification_history
GROUP BY notification_type;

-- Active subscriptions
SELECT COUNT(DISTINCT user_id) FROM push_subscriptions;
```

### Clean Up Expired Subscriptions

```sql
-- Find subscriptions not used in 30 days
SELECT * FROM push_subscriptions 
WHERE last_used_at < NOW() - INTERVAL '30 days';

-- Delete expired subscriptions
DELETE FROM push_subscriptions 
WHERE last_used_at < NOW() - INTERVAL '90 days';
```

---

## Production Checklist

Before going live, verify:

- [ ] VAPID keys generated and stored securely
- [ ] Database schema deployed
- [ ] Environment variables set (frontend `.env`)
- [ ] Supabase secrets configured
- [ ] Edge Function deployed and active
- [ ] HTTPS enabled on production domain
- [ ] Tested on iOS device (added to home screen)
- [ ] Tested on Android device
- [ ] Tested on desktop browser
- [ ] Quiet hours working correctly
- [ ] Badge counts updating
- [ ] Notification preferences saving
- [ ] All notification types working
- [ ] Error handling tested

---

## Security Best Practices

1. **Never expose VAPID private key** - only in Supabase secrets
2. **Use HTTPS in production** - required for push notifications
3. **Validate user permissions** - RLS policies enforce user-specific data
4. **Rate limit notifications** - avoid spamming users
5. **Respect quiet hours** - implemented via database function
6. **Allow unsubscribe** - users can disable anytime

---

## Support & Resources

- **Web Push Protocol:** https://web.dev/push-notifications-overview/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **VAPID Spec:** https://datatracker.ietf.org/doc/html/rfc8292
- **Browser Compatibility:** https://caniuse.com/push-api

---

## What's Next?

After setup is complete, consider:

- 📊 Adding analytics dashboard for notification performance
- 🤖 Scheduling automatic reminders (e.g., "Meet tomorrow!")
- 🎯 Segmenting notifications by group/team
- 📱 Custom notification sounds
- 🖼️ Rich notifications with images
- 🔄 Push-to-refresh sync

---

**Need Help?** Check the troubleshooting section or review Edge Function logs with `supabase functions logs send-push`.

