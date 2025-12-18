# 🚀 Push Notifications - Vercel Deployment Guide

Complete guide for deploying push notifications when using **Vercel** for frontend hosting.

---

## 📋 Architecture Overview

With Vercel deployment:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Supabase      │         │  Push Services  │
│   (Vercel)      │────────▶│  Edge Functions  │────────▶│  (Browser/OS)   │
│                 │         │   + Database     │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Key Point:** 
- ✅ Frontend deploys to **Vercel**
- ✅ Database & Edge Functions deploy to **Supabase** (separate)
- ✅ These work together seamlessly

---

## ✅ Step-by-Step Deployment

### 1️⃣ Generate VAPID Keys (2 minutes)

**Run locally (only once):**

```bash
npx web-push generate-vapid-keys
```

**Save the output somewhere secure:**
```
Public Key: BPX5c1ygFJ...
Private Key: aB3dE...
```

⚠️ **Important:** Keep these keys safe! You'll need them for both Vercel and Supabase.

---

### 2️⃣ Deploy Database Schema to Supabase (3 minutes)

**Option A: Via Supabase Dashboard (Recommended for Vercel users)**

1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Click **"New Query"**
5. Copy entire contents of `database/push_notifications_schema.sql`
6. Paste into editor
7. Click **"Run"**
8. Verify success message

**Option B: Via Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push database/push_notifications_schema.sql
```

**Verify Tables Created:**
- Go to **Table Editor** in Supabase dashboard
- Check for: `push_subscriptions`, `notification_preferences`, `user_badge_counts`, `notification_history`

---

### 3️⃣ Deploy Edge Function to Supabase (5 minutes)

**Important:** Edge Functions deploy to **Supabase**, NOT Vercel!

#### Option A: Via Supabase Dashboard (Easiest)

1. Go to **Edge Functions** in Supabase dashboard
2. Click **"Create Function"**
3. Name: `send-push`
4. Copy contents of `supabase/functions/send-push/index.ts`
5. Paste into editor
6. Click **"Deploy"**

#### Option B: Via Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-push
```

**Verify Deployment:**
- Go to **Edge Functions** in Supabase dashboard
- You should see `send-push` with status "Active"

---

### 4️⃣ Set Supabase Secrets (2 minutes)

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add three secrets:

| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | Your public key from Step 1 |
| `VAPID_PRIVATE_KEY` | Your private key from Step 1 |
| `VAPID_SUBJECT` | `mailto:your-email@stormtracker.com` |

3. Click **"Add Secret"** for each
4. **Redeploy Edge Function** after adding secrets (important!)

**Option B: Via Supabase CLI**

```bash
supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:admin@stormtracker.com"
```

---

### 5️⃣ Configure Vercel Environment Variables (3 minutes)

**In Vercel Dashboard:**

1. Go to your project in Vercel
2. Go to **Settings** → **Environment Variables**
3. Add this variable:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_VAPID_PUBLIC_KEY` | Your public key from Step 1 | Production, Preview, Development |

4. Click **"Save"**

**⚠️ Important Notes:**
- Only add the **PUBLIC** key to Vercel
- **NEVER** add the private key to Vercel
- Make sure the name is exactly `VITE_VAPID_PUBLIC_KEY` (Vite requires `VITE_` prefix)

**Screenshot locations in Vercel:**
```
Project → Settings → Environment Variables → Add New
```

---

### 6️⃣ Deploy to Vercel (2 minutes)

**If already connected to GitHub:**

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add push notifications"
   git push origin main
   ```

2. Vercel will auto-deploy (if connected)

3. Wait for deployment to complete

**If NOT connected to GitHub:**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Follow prompts

---

### 7️⃣ Verify HTTPS (1 minute)

Push notifications **require HTTPS** in production.

✅ **Good News:** Vercel provides HTTPS automatically!

**Verify:**
1. Visit your deployed site
2. Check URL starts with `https://`
3. Check for lock icon in browser

---

### 8️⃣ Test Notifications (5 minutes)

**On your deployed Vercel site:**

1. **Login as a parent account**
2. **Navigate to Notifications page** (bell icon in sidebar)
3. **Click "Enable" button**
4. **Allow notifications** when browser prompts
5. **Click "Send Test Notification"**
6. **You should see:** "Test notification sent! Check your notifications."
7. **Verify:** Test notification appears

**If it works:** ✅ You're done!

**If not:** See [Troubleshooting](#troubleshooting) below

---

## 🔍 Vercel-Specific Considerations

### Environment Variables

**Local Development (.env file):**
```env
VITE_VAPID_PUBLIC_KEY=your_public_key
```

**Vercel Deployment (Dashboard):**
- Add `VITE_VAPID_PUBLIC_KEY` via Vercel dashboard
- Applied automatically on next deployment
- No .env file needed on Vercel

### Build Command

Your `package.json` should have:
```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  }
}
```

Vercel auto-detects this. No special configuration needed.

### Service Worker

The service worker (`public/service-worker.js`) will be served by Vercel automatically. No special configuration needed.

### Static Assets

Icons in `public/icons/` will be served by Vercel automatically.

---

## 🐛 Troubleshooting

### Issue: "VAPID key not configured"

**Causes:**
1. Environment variable not set in Vercel
2. Variable name incorrect (must be `VITE_VAPID_PUBLIC_KEY`)
3. Need to redeploy after adding variable

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Verify `VITE_VAPID_PUBLIC_KEY` exists
3. Check spelling and value
4. **Redeploy:**
   - Go to Deployments
   - Click "..." on latest deployment
   - Click "Redeploy"

### Issue: Edge Function Returns 500

**Causes:**
1. Supabase secrets not set
2. Edge Function not deployed
3. Database schema not deployed

**Fix:**
1. Check Supabase → Edge Functions → Secrets
2. Verify all 3 secrets exist (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
3. Redeploy Edge Function after adding secrets
4. Check Edge Function logs in Supabase dashboard

### Issue: Service Worker Not Registering

**Causes:**
1. Not using HTTPS (Vercel should handle this)
2. Browser cache

**Fix:**
1. Verify site is HTTPS
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Check browser console for errors

### Issue: Build Fails on Vercel

**Causes:**
1. Missing dependencies
2. TypeScript errors
3. Build command incorrect

**Fix:**
1. Check Vercel build logs
2. Ensure `vite-plugin-pwa` is in `package.json` dependencies (not devDependencies if using Vercel's default build)
3. Try building locally: `npm run build`
4. Fix any errors shown

---

## 📊 Vercel vs Local Development

| Aspect | Local Dev | Vercel Production |
|--------|-----------|-------------------|
| Environment Variables | `.env` file | Vercel dashboard |
| HTTPS | Not required (localhost) | Required (auto-provided) |
| Service Worker | Works on localhost | Requires HTTPS |
| Edge Functions | Supabase (same) | Supabase (same) |
| Database | Supabase (same) | Supabase (same) |
| Hot Reload | Yes | No (static build) |

---

## 🔄 Update/Redeploy Workflow

### When You Update Frontend Code

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update notifications"
   git push origin main
   ```

2. **Vercel auto-deploys** (if connected)

3. **No need to touch Supabase** (unless database/Edge Function changed)

### When You Update Edge Function

1. **Deploy to Supabase:**
   ```bash
   supabase functions deploy send-push
   ```

2. **No need to redeploy Vercel** (Edge Functions are separate)

### When You Update Database Schema

1. **Run migration in Supabase dashboard** (SQL Editor)

2. **No need to redeploy anything else**

---

## ✅ Deployment Checklist

Copy this checklist:

- [ ] Generated VAPID keys
- [ ] Deployed database schema to Supabase
- [ ] Deployed Edge Function to Supabase
- [ ] Set 3 Supabase secrets (VAPID keys + subject)
- [ ] Redeployed Edge Function after setting secrets
- [ ] Added `VITE_VAPID_PUBLIC_KEY` to Vercel environment variables
- [ ] Pushed code to GitHub
- [ ] Vercel deployed successfully
- [ ] Site is HTTPS
- [ ] Tested notifications as parent on deployed site
- [ ] Notifications received successfully
- [ ] Badge counts working
- [ ] Notification preferences saving

---

## 🎯 Quick Test Script

After deployment, test with this:

```javascript
// Open browser console on your Vercel site, run this:

// 1. Check environment variable loaded
console.log('VAPID Key:', import.meta.env.VITE_VAPID_PUBLIC_KEY?.substring(0, 20) + '...');

// 2. Check service worker registered
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Registered ✅' : 'Not Registered ❌');
});

// 3. Check notification permission
console.log('Permission:', Notification.permission);

// 4. Check if push supported
console.log('Push Supported:', 'PushManager' in window ? 'Yes ✅' : 'No ❌');
```

All should show ✅. If not, check troubleshooting.

---

## 🔐 Security Notes for Vercel

✅ **Safe to add to Vercel:**
- `VITE_VAPID_PUBLIC_KEY` (public key)

❌ **NEVER add to Vercel:**
- VAPID private key (only in Supabase secrets)
- Supabase service role key
- Any private credentials

**Why?** 
- Vercel environment variables are baked into client-side bundle
- Only public keys can be safely exposed
- Private keys stay in Supabase (server-side only)

---

## 📱 Platform Testing

After Vercel deployment, test on:

- [ ] **iOS Safari** (iOS 16.4+)
  - Add to home screen
  - Open from home screen
  - Enable notifications
  - Receive test notification

- [ ] **Android Chrome**
  - Install PWA
  - Enable notifications
  - Receive test notification

- [ ] **Desktop Chrome**
  - Enable notifications
  - Receive test notification

---

## 🚀 Production Rollout

Once testing passes:

1. **Announce to parents:**
   - Send email with installation instructions
   - Create Daily Brief post explaining feature
   - Include iOS-specific instructions

2. **Monitor first week:**
   - Check Edge Function logs daily
   - Monitor subscription count
   - Watch for error patterns

3. **Gather feedback:**
   - Ask parents about experience
   - Note any issues or confusion
   - Iterate on notification content

---

## 📞 Support Resources

**Vercel Issues:**
- Vercel Dashboard → Deployments → View Logs
- https://vercel.com/docs

**Supabase Issues:**
- Supabase Dashboard → Edge Functions → Logs
- https://supabase.com/docs

**Push Notification Issues:**
- Browser console (F12)
- See main troubleshooting guide: `PUSH_NOTIFICATIONS_SETUP.md`

---

## 🎓 Key Takeaways for Vercel Deployment

1. ✅ **Frontend** → Vercel (automatic)
2. ✅ **Database & Edge Functions** → Supabase (manual deploy)
3. ✅ **Environment Variables** → Both places (public key in Vercel, private key in Supabase)
4. ✅ **HTTPS** → Automatic with Vercel
5. ✅ **Service Worker** → Works automatically on Vercel

**Bottom Line:** Vercel handles your React app, Supabase handles your backend. They work together perfectly for push notifications!

---

**Ready to deploy?** Follow the steps above in order. Total time: ~20 minutes.

**Need help?** Check the troubleshooting section or review Vercel/Supabase logs.

---

**Last Updated:** December 2024  
**For:** Vercel + Supabase Deployment

