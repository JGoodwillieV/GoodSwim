# 🚀 Push Notifications Quick Start

Get push notifications working in 5 minutes!

## ⚡ Prerequisites

- Node.js installed
- Supabase project ready
- Vercel account (for deployment)
- Terminal access

**🚀 Deploying to Vercel?** See the [Vercel Deployment Guide](./PUSH_NOTIFICATIONS_VERCEL_DEPLOYMENT.md) for detailed steps.

## 📝 Quick Steps

### 1️⃣ Generate VAPID Keys (30 seconds)

```bash
npx web-push generate-vapid-keys
```

Copy both keys that are printed. You'll need them in the next steps.

### 2️⃣ Set Frontend Variable (30 seconds)

**For Local Development:**
Create `.env` in your project root:

```env
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
```

**For Vercel Deployment:**
Add environment variable in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add: `VITE_VAPID_PUBLIC_KEY` = `YOUR_PUBLIC_KEY_HERE`

### 3️⃣ Deploy Database Schema (1 minute)

```bash
# Using Supabase CLI
supabase db push database/push_notifications_schema.sql
```

**Or via Dashboard:**
- Go to SQL Editor in Supabase
- Copy/paste `database/push_notifications_schema.sql`
- Click Run

### 4️⃣ Set Supabase Secrets (1 minute)

```bash
supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:admin@stormtracker.com"
```

### 5️⃣ Deploy Edge Function (1 minute)

```bash
supabase functions deploy send-push
```

### 6️⃣ Test It! (2 minutes)

1. Start your dev server: `npm run dev`
2. Login as a parent
3. Click bell icon → "Enable" notifications
4. Allow when browser prompts
5. Click "Send Test Notification"
6. You should see a test notification! 🎉

---

## ✅ Done!

Your push notifications are now live. Parents will automatically receive notifications when:

- 📢 Coaches post Daily Brief announcements
- ⚠️ Action items need attention
- 🏊 Meet results are uploaded
- ⏱️ Test sets are recorded

## 🐛 Not Working?

**Most common issues:**

1. **"VAPID key not configured"** → Restart your dev server
2. **No notification received** → Check browser allows notifications
3. **iOS not working** → App must be added to home screen first

See full troubleshooting: [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md#troubleshooting)

## 📚 Next Steps

- Read full setup guide: `PUSH_NOTIFICATIONS_SETUP.md`
- Check notification preferences in parent dashboard
- Test quiet hours feature
- Customize notification messages in code

---

**Questions?** Check `supabase/functions/send-push/README.md` or review Edge Function logs.

