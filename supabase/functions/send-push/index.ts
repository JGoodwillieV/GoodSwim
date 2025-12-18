// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import webpush from 'npm:web-push@3.6.6'

// VAPID keys (set these in Supabase secrets)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@stormtracker.com'

// Configure web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

interface PushPayload {
  user_ids: string[]
  title: string
  body: string
  url?: string
  tag?: string
  notification_type: string
  actions?: Array<{ action: string; title: string }>
}

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
  user_id: string
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key (only service role should call this)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Parse request body
    const payload: PushPayload = await req.json()
    
    console.log('📬 Sending push notifications:', {
      user_count: payload.user_ids.length,
      notification_type: payload.notification_type,
      title: payload.title
    })

    // Validate payload
    if (!payload.user_ids || payload.user_ids.length === 0) {
      throw new Error('user_ids array is required')
    }
    if (!payload.title || !payload.body) {
      throw new Error('title and body are required')
    }
    if (!payload.notification_type) {
      throw new Error('notification_type is required')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get push subscriptions for all target users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', payload.user_ids)

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No subscriptions found for these users')
      return new Response(
        JSON.stringify({ sent: 0, message: 'No active subscriptions' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${subscriptions.length} subscriptions`)

    // Get notification preferences for these users
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('user_id, ' + payload.notification_type)
      .in('user_id', payload.user_ids)

    // Create a map of user preferences (default to true if no preference set)
    const preferenceMap = new Map<string, boolean>()
    preferences?.forEach(pref => {
      preferenceMap.set(pref.user_id, pref[payload.notification_type] !== false)
    })

    // Filter subscriptions based on preferences
    const filteredSubscriptions: PushSubscription[] = subscriptions.filter(sub => {
      // If no preference set, default to sending (opt-in by default)
      const shouldSend = preferenceMap.get(sub.user_id) !== false
      if (!shouldSend) {
        console.log(`🔕 Notification disabled for user ${sub.user_id}`)
      }
      return shouldSend
    })

    console.log(`📊 Sending to ${filteredSubscriptions.length} out of ${subscriptions.length} subscriptions (after preference filtering)`)

    // Send push notifications
    const results = await Promise.allSettled(
      filteredSubscriptions.map((sub) => sendPushNotification(sub, payload, supabase))
    )

    // Count successful sends
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value === true).length
    const failed = results.length - sent

    console.log(`✅ Sent: ${sent}, ❌ Failed: ${failed}`)

    // Increment badge counts for users who received notifications
    if (sent > 0) {
      const successfulUserIds = filteredSubscriptions
        .filter((_, i) => results[i].status === 'fulfilled')
        .map(sub => sub.user_id)

      await supabase.rpc('increment_badge_counts', {
        user_ids: successfulUserIds
      })
    }

    // Save to notification history
    const historyRecords = filteredSubscriptions.map(sub => ({
      user_id: sub.user_id,
      title: payload.title,
      body: payload.body,
      notification_type: payload.notification_type,
      url: payload.url || '/',
      sent_at: new Date().toISOString()
    }))

    if (historyRecords.length > 0) {
      await supabase.from('notification_history').insert(historyRecords)
    }

    return new Response(
      JSON.stringify({ 
        sent, 
        failed,
        total: results.length 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in send-push function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Send a push notification using Web Push protocol
 */
async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  supabase: any
): Promise<boolean> {
  try {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || `notification-${Date.now()}`,
      actions: payload.actions || []
    })

    // Convert subscription to web-push format
    const webPushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }

    // Send notification using web-push library
    const response = await webpush.sendNotification(
      webPushSubscription,
      pushPayload,
      {
        TTL: 86400, // 24 hours
      }
    )

    console.log('✅ Push sent successfully')
    return true

  } catch (error: any) {
    // Handle gone subscriptions (410, 404)
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      console.log('🗑️ Removing expired subscription:', subscription.endpoint.substring(0, 50))
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint)
      return false
    }

    console.error(`❌ Push failed (${error?.statusCode || 'unknown'}):`, error?.body || error?.message || error)
    return false
  }
}

// All VAPID signing and encryption is now handled by the web-push library

