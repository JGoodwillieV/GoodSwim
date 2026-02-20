// supabase/functions/sync-swimmer-billing/index.ts
// Syncs swimmer count to Stripe subscription quantity
// Called by database trigger on swimmers table and can be called manually

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { team_id, swimmer_count: providedCount } = await req.json()

    if (!team_id) {
      return new Response(
        JSON.stringify({ error: 'Missing team_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get subscription details
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_subscription_item_id, tier, status')
      .eq('team_id', team_id)
      .single()

    if (subError || !sub) {
      console.log(`No subscription found for team ${team_id}`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'no_subscription' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only sync for active paid subscriptions
    if (!sub.stripe_subscription_id || !['active', 'trialing'].includes(sub.status) || !['starter', 'pro', 'club'].includes(sub.tier)) {
      console.log(`Skipping sync for team ${team_id}: status=${sub.status}, tier=${sub.tier}`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'not_active_paid' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count swimmers from database (authoritative source)
    const { count: dbSwimmerCount } = await supabase
      .from('swimmers')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team_id)

    const swimmerCount = Math.max(dbSwimmerCount || providedCount || 1, 1)

    // If we don't have the subscription_item_id, fetch it from Stripe
    let subscriptionItemId = sub.stripe_subscription_item_id
    if (!subscriptionItemId) {
      console.log(`Fetching subscription item ID from Stripe for ${sub.stripe_subscription_id}`)
      const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      subscriptionItemId = stripeSubscription.items.data[0]?.id

      if (subscriptionItemId) {
        // Store it for future use
        await supabase
          .from('subscriptions')
          .update({ stripe_subscription_item_id: subscriptionItemId })
          .eq('team_id', team_id)
      }
    }

    if (!subscriptionItemId) {
      console.error(`Could not find subscription item ID for team ${team_id}`)
      return new Response(
        JSON.stringify({ error: 'No subscription item found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update quantity on the Stripe subscription item
    console.log(`Updating subscription item ${subscriptionItemId} quantity to ${swimmerCount} for team ${team_id}`)

    const updatedItem = await stripe.subscriptionItems.update(subscriptionItemId, {
      quantity: swimmerCount,
      proration_behavior: 'create_prorations',
    })

    console.log(`Successfully updated quantity to ${updatedItem.quantity} for team ${team_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        team_id,
        quantity: updatedItem.quantity,
        swimmer_count: swimmerCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync billing error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to sync billing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
