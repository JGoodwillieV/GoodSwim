# 🚀 Push Notifications Deployment Checklist

Use this checklist to ensure push notifications are properly deployed to production.

## ✅ Pre-Deployment

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

- [ ] Public key generated and saved securely
- [ ] Private key generated and saved securely
- [ ] Keys stored in password manager or secure vault
- [ ] Never committed to version control

### 2. Configure Environment Variables

- [ ] `.env` file created (not committed)
- [ ] `VITE_VAPID_PUBLIC_KEY` set in `.env`
- [ ] `.env.example` updated as reference
- [ ] `.gitignore` includes `.env`

### 3. Database Schema

- [ ] Connected to production Supabase project
- [ ] Ran `database/push_notifications_schema.sql`
- [ ] Verified tables created:
  - [ ] `push_subscriptions`
  - [ ] `notification_preferences`
  - [ ] `user_badge_counts`
  - [ ] `notification_history`
- [ ] Verified functions created:
  - [ ] `increment_badge_counts`
  - [ ] `clear_badge_count`
  - [ ] `should_send_notification`
- [ ] RLS policies enabled on all tables
- [ ] Tested policies with non-admin user

### 4. Supabase Secrets

```bash
supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:admin@stormtracker.com"
```

- [ ] All three secrets set
- [ ] Verified with `supabase secrets list`
- [ ] Email in VAPID_SUBJECT is valid

### 5. Edge Function

- [ ] Edge function code reviewed
- [ ] Tested locally with `supabase functions serve send-push`
- [ ] Deployed with `supabase functions deploy send-push`
- [ ] Verified deployment with `supabase functions list`
- [ ] Tested with production credentials

---

## 🧪 Testing Phase

### Local Testing

- [ ] Dev server runs without errors
- [ ] No console errors on page load
- [ ] NotificationSettings page loads correctly
- [ ] Can subscribe to notifications
- [ ] Test notification appears
- [ ] Can unsubscribe from notifications

### Parent User Testing

**iOS Device:**
- [ ] Added app to home screen
- [ ] Opened from home screen icon
- [ ] Enabled notifications
- [ ] Received test notification
- [ ] Badge count appears on icon
- [ ] Clicking notification opens correct page
- [ ] Badge clears when app opened

**Android Device:**
- [ ] Installed PWA
- [ ] Enabled notifications
- [ ] Received test notification
- [ ] Badge count appears (if supported)
- [ ] Notification opens correct page
- [ ] Can customize preferences

**Desktop Browser:**
- [ ] Installed PWA or using in browser
- [ ] Enabled notifications
- [ ] Received test notification
- [ ] Notification opens correct page
- [ ] Badge appears (Windows 10+, macOS Big Sur+)

### Coach Trigger Testing

- [ ] Create Daily Brief → Parent receives notification
- [ ] Upload SD3 file → Parents receive action item notification
- [ ] Upload meet results → Parents receive results notification
- [ ] Record test set → Parents receive test set notification
- [ ] Create calendar event → Parents receive practice update (if implemented)

### Preference Testing

- [ ] Disable notification type → No notification received
- [ ] Enable notification type → Notification received
- [ ] Set quiet hours → No notifications during quiet hours
- [ ] Outside quiet hours → Notifications received
- [ ] All preferences save correctly
- [ ] Preferences persist after logout/login

### Badge Count Testing

- [ ] Badge increments when notification sent
- [ ] Badge shows correct count
- [ ] Badge clears when app opened
- [ ] Badge clears when "Clear" button clicked
- [ ] Multiple notifications increment correctly

---

## 🌐 Production Deployment

### Frontend Deployment

- [ ] `.env` file NOT committed
- [ ] `VITE_VAPID_PUBLIC_KEY` set in build environment (Vercel/Netlify)
- [ ] Build completes without errors
- [ ] No console errors in production
- [ ] Service worker registers correctly
- [ ] Manifest.json accessible
- [ ] Icons load correctly

### Verify HTTPS

- [ ] Production site uses HTTPS
- [ ] No mixed content warnings
- [ ] Valid SSL certificate
- [ ] Service worker registers on HTTPS

### DNS & Domain

- [ ] Custom domain configured (if using)
- [ ] SSL certificate valid
- [ ] Site accessible via domain

---

## 📊 Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor Edge Function logs: `supabase functions logs send-push`
- [ ] Check for errors in logs
- [ ] Verify notifications being sent
- [ ] Check notification_history table for records
- [ ] Monitor user subscriptions in push_subscriptions table

### Database Queries

```sql
-- Check subscriptions
SELECT COUNT(*) FROM push_subscriptions;

-- Check notifications sent
SELECT COUNT(*) FROM notification_history 
WHERE sent_at > NOW() - INTERVAL '24 hours';

-- Check for errors (look at Edge Function logs)
```

### Analytics to Track

- [ ] Number of active subscriptions
- [ ] Notifications sent per day
- [ ] Notification click-through rate (if tracking)
- [ ] User opt-out rate
- [ ] Peak notification times

---

## 🐛 Common Issues & Solutions

### Issue: "VAPID key not configured"

**Fix:**
- Check environment variable is set
- Restart build/dev server
- Verify no typos in key

### Issue: Notifications not received

**Debug:**
1. Check Edge Function logs
2. Verify push_subscriptions has user's subscription
3. Check notification_preferences
4. Verify not in quiet hours
5. Test with "Send Test Notification"

### Issue: iOS notifications not working

**Fix:**
- Verify iOS 16.4+
- App must be added to home screen
- Must open from home screen icon
- Re-enable notifications after install

### Issue: Badge not showing

**Fix:**
- Badge only works for installed PWAs
- Ensure app is installed
- Check platform supports Badge API

---

## 📱 User Onboarding

### For Parents

Provide these instructions:

**iOS:**
1. Open StormTracker in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Open app from home screen
5. Tap bell icon and enable notifications

**Android:**
1. Open StormTracker in Chrome
2. Install app from prompt or menu
3. Open app from home screen
4. Tap bell icon and enable notifications

**Desktop:**
1. Open StormTracker
2. Click install icon in address bar
3. Click bell icon and enable notifications

### Documentation for Users

- [ ] Create parent FAQ about notifications
- [ ] Add troubleshooting guide to help center
- [ ] Include iOS installation instructions
- [ ] Include notification preference guide

---

## 🔐 Security Checklist

- [ ] VAPID private key never exposed to frontend
- [ ] VAPID private key only in Supabase secrets
- [ ] RLS policies enabled on all notification tables
- [ ] Edge Function only callable with valid auth
- [ ] No sensitive data in notification payloads
- [ ] User can unsubscribe at any time
- [ ] Quiet hours respected
- [ ] Rate limiting considered (if needed)

---

## 📝 Documentation

- [ ] Updated README with push notification info
- [ ] Created setup guide for developers
- [ ] Created user guide for parents
- [ ] Documented all notification types
- [ ] API documentation for triggers
- [ ] Troubleshooting guide complete

---

## 🎯 Success Criteria

Push notifications are successfully deployed when:

- ✅ At least 50% of parents have enabled notifications
- ✅ Notifications delivered within 5 seconds of trigger
- ✅ < 1% error rate in Edge Function logs
- ✅ No user complaints about spam/timing
- ✅ Badge counts accurate
- ✅ All notification types working
- ✅ Works on iOS, Android, and Desktop

---

## 📅 Rollout Plan

### Phase 1: Soft Launch (Week 1)

- [ ] Deploy to production
- [ ] Enable for coaching staff only
- [ ] Monitor logs and errors
- [ ] Fix any critical issues

### Phase 2: Beta Testing (Week 2)

- [ ] Enable for 10-20 parent volunteers
- [ ] Gather feedback
- [ ] Iterate on notification content
- [ ] Fix reported bugs

### Phase 3: Full Rollout (Week 3)

- [ ] Announce to all parents
- [ ] Send installation instructions
- [ ] Provide support during onboarding
- [ ] Monitor adoption rate

### Phase 4: Optimization (Week 4+)

- [ ] Analyze notification performance
- [ ] Optimize notification timing
- [ ] Improve notification content
- [ ] Add new notification types as needed

---

## 🔄 Maintenance Tasks

### Weekly

- [ ] Check Edge Function logs for errors
- [ ] Monitor subscription count
- [ ] Review notification history

### Monthly

- [ ] Clean up expired subscriptions (90+ days old)
- [ ] Review notification preferences adoption
- [ ] Analyze notification engagement
- [ ] Update documentation as needed

### Quarterly

- [ ] Review VAPID keys (rotate if needed)
- [ ] Update dependencies (vite-plugin-pwa, etc)
- [ ] Test on latest browser versions
- [ ] Review and optimize Edge Function

---

## 🆘 Emergency Procedures

### If Notifications Are Spam/Broken

1. **Disable in code temporarily:**
   ```javascript
   // In pushNotifications.js, add at top of sendPushNotification:
   console.warn('Notifications temporarily disabled');
   return { success: false, error: 'Disabled' };
   ```

2. **Deploy fix immediately**

3. **Notify users via email/announcement**

### If VAPID Keys Compromised

1. **Generate new VAPID keys**
2. **Update Supabase secrets**
3. **Update frontend `.env`**
4. **Deploy immediately**
5. **Clear all push_subscriptions** (users will need to re-subscribe)

---

## ✅ Final Sign-Off

Deployment completed by: _________________  
Date: _________________  
All checklist items verified: [ ] Yes [ ] No  
Production URL: _________________  
Monitoring dashboard: _________________

**Notes:**

