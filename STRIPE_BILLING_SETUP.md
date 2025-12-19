# GoodSwim Stripe Billing Integration

Complete guide to set up Stripe billing for GoodSwim.

## Overview

Your billing system includes:
- **3 subscription tiers**: Starter ($1/mo), Pro ($3/mo), Club ($5/mo)
- **14-day free trial** for new signups
- **Stripe Checkout** for secure payments
- **Customer Portal** for self-service billing management
- **Webhook handling** for real-time subscription updates

---

## Step 1: Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# The schema is located at:
database/subscriptions_schema.sql
```

This creates:
- `subscriptions` table - stores subscription status per team
- `feature_limits` table - defines what each tier can access
- Auto-creates trial subscriptions for new coach signups

---

## Step 2: Create Stripe Products

### 2.1 Log in to Stripe Dashboard
Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)

### 2.2 Create Products
Navigate to **Products** → **Add Product** and create these 3 products:

| Product Name | Price | Billing |
|--------------|-------|---------|
| GoodSwim Starter | $1.00 | Monthly, recurring |
| GoodSwim Pro | $3.00 | Monthly, recurring |
| GoodSwim Club | $5.00 | Monthly, recurring |

### 2.3 Copy Price IDs
After creating each product, copy the **Price ID** (starts with `price_`).

You'll need:
- `STRIPE_STARTER_PRICE_ID` = price_xxxxx
- `STRIPE_PRO_PRICE_ID` = price_xxxxx  
- `STRIPE_CLUB_PRICE_ID` = price_xxxxx

---

## Step 3: Configure Stripe Settings

### 3.1 Get Your API Keys
In Stripe Dashboard → **Developers** → **API Keys**:
- Copy your **Secret key** (starts with `sk_live_` or `sk_test_`)

### 3.2 Set Up Customer Portal
Go to **Settings** → **Billing** → **Customer Portal**:
1. Enable the Customer Portal
2. Configure allowed actions:
   - ✅ Update payment methods
   - ✅ View invoice history
   - ✅ Cancel subscriptions
3. Save configuration

### 3.3 Create Webhook Endpoint
Go to **Developers** → **Webhooks** → **Add Endpoint**:

**Endpoint URL:**
```
https://ozznaspwqcfxulgqovro.supabase.co/functions/v1/stripe-webhook
```

**Events to listen for:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

After creating, copy the **Webhook Signing Secret** (starts with `whsec_`)

---

## Step 4: Configure Supabase Secrets

Run these commands with the Supabase CLI:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ozznaspwqcfxulgqovro

# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_key_here
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
supabase secrets set STRIPE_STARTER_PRICE_ID=price_your_starter_id
supabase secrets set STRIPE_PRO_PRICE_ID=price_your_pro_id
supabase secrets set STRIPE_CLUB_PRICE_ID=price_your_club_id
supabase secrets set APP_URL=https://your-app-domain.com
```

**Or via Supabase Dashboard:**
1. Go to Project Settings → Edge Functions
2. Add each secret as an environment variable

---

## Step 5: Deploy Edge Functions

Deploy all three billing functions:

```bash
cd path/to/GoodSwim

# Deploy create-checkout function
supabase functions deploy create-checkout --no-verify-jwt

# Deploy billing-portal function
supabase functions deploy billing-portal --no-verify-jwt

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook --no-verify-jwt
```

**Important:** The `--no-verify-jwt` flag is needed for webhook to work without authentication.

---

## Step 6: Test the Integration

### 6.1 Use Stripe Test Mode
Make sure you're using **test mode** API keys during development:
- Test secret key: `sk_test_...`
- Test webhook secret from test mode

### 6.2 Test Cards
Use these Stripe test card numbers:

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0000 0000 3220 | 3D Secure required |

### 6.3 Test Flow
1. Log in as a coach
2. Go to **Billing** in sidebar
3. Click **Upgrade to Pro**
4. Complete checkout with test card
5. Verify subscription updated in your Supabase `subscriptions` table

---

## Step 7: Go Live

### Checklist
- [ ] Stripe products created with live prices
- [ ] Live API keys configured in Supabase secrets
- [ ] Webhook endpoint updated with live signing secret
- [ ] Customer portal configured
- [ ] Test a real purchase (can refund immediately)

### Switch to Live Mode
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_live_key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

---

## File Reference

| File | Purpose |
|------|---------|
| `database/subscriptions_schema.sql` | Database tables and RLS policies |
| `src/hooks/useSubscription.js` | React hook for subscription state |
| `src/components/BillingSettings.jsx` | Billing UI component |
| `supabase/functions/create-checkout/` | Creates Stripe Checkout session |
| `supabase/functions/billing-portal/` | Opens Stripe Customer Portal |
| `supabase/functions/stripe-webhook/` | Handles Stripe events |

---

## Feature Gating

Use the `useSubscription` hook to gate features:

```jsx
import { useSubscription } from '../hooks/useSubscription';

function MyComponent() {
  const { hasFeature, canAddSwimmer, tier, isPaid } = useSubscription();
  
  // Check specific feature
  if (!hasFeature('ai_video_analysis')) {
    return <UpgradePrompt feature="AI Video Analysis" requiredTier="club" />;
  }
  
  // Check swimmer limits
  if (!canAddSwimmer()) {
    return <UpgradePrompt message="Swimmer limit reached" />;
  }
  
  return <ActualFeature />;
}
```

---

## Troubleshooting

### "Edge function not found"
```bash
supabase functions deploy create-checkout --no-verify-jwt
```

### "Stripe products not configured"
Ensure all price IDs are set in Supabase secrets:
```bash
supabase secrets list
```

### Webhook not updating database
1. Check webhook logs in Stripe Dashboard
2. Check Edge Function logs in Supabase Dashboard
3. Verify webhook secret is correct

### Customer portal not opening
Ensure you've enabled and configured the Customer Portal in Stripe Dashboard settings.

---

## Support

For issues with:
- **Stripe integration**: Check [Stripe Docs](https://stripe.com/docs)
- **Supabase Edge Functions**: Check [Supabase Edge Docs](https://supabase.com/docs/guides/functions)
- **This implementation**: Review the code in the files listed above

