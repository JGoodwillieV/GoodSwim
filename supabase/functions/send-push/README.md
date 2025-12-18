# Send Push Notification Edge Function

This Supabase Edge Function sends push notifications to users using the Web Push protocol.

## Setup

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BG...
Private Key: aB...
```

### 2. Set Supabase Secrets

```bash
# Set VAPID keys
supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:your-email@stormtracker.com"
```

### 3. Set Environment Variable for Frontend

Create a `.env` file in your project root:

```env
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY
```

### 4. Deploy the Function

```bash
supabase functions deploy send-push
```

## Usage

### From Your Application

```javascript
// Trigger a notification
const { data, error } = await supabase.functions.invoke('send-push', {
  body: {
    user_ids: ['uuid-1', 'uuid-2'],
    title: '🏊 New Daily Brief',
    body: 'Check out today\'s announcement!',
    url: '/parent/daily-brief',
    notification_type: 'daily_brief',
    tag: 'daily-brief-123'
  }
})
```

### Notification Types

- `daily_brief` - Daily Brief posts
- `action_items` - Action Center items
- `meet_reminders` - Meet reminders
- `meet_results` - Meet results
- `test_set_results` - Test set results
- `practice_updates` - Practice updates

## Testing

You can test the function locally:

```bash
supabase functions serve send-push
```

Then send a test request:

```bash
curl -X POST http://localhost:54321/functions/v1/send-push \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["user-uuid"],
    "title": "Test Notification",
    "body": "This is a test",
    "notification_type": "daily_brief"
  }'
```

## Important Notes

⚠️ **Production Web Push Encryption**: The current implementation uses simplified encryption. For production, consider using the `web-push` npm package or a proper Web Push library that implements full aes128gcm encryption.

🔐 **Security**: Only service role key should call this function. Never expose it to clients directly.

📊 **Badge Counts**: The function automatically increments badge counts for users who receive notifications.

🔕 **Quiet Hours**: The function respects user quiet hours preferences and notification type preferences.

