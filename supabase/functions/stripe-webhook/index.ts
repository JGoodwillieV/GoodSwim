// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events to update subscription status
// Updated with compatible Deno imports

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Map Price IDs to tier names
const TIER_MAP: Record<string, string> = {
  [Deno.env.get('STRIPE_STARTER_PRICE_ID') || '']: 'starter',
  [Deno.env.get('STRIPE_PRO_PRICE_ID') || '']: 'pro',
  [Deno.env.get('STRIPE_CLUB_PRICE_ID') || '']: 'club',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Stripe keys not configured')
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    })

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the raw body
    const body = await req.text()

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Received webhook event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('Checkout session completed:', session.id)
        
        // Get team_id from metadata
        const teamId = session.metadata?.team_id
        const tier = session.metadata?.tier || 'starter'
        
        if (teamId && session.subscription) {
          // Fetch the subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          
          // Update subscription in database
          const { error: updateError } = await supabase
            .from('subscriptions')
            .upsert({
              team_id: teamId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              status: subscription.status,
              tier: tier,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'team_id'
            })
          
          if (updateError) {
            console.error('Failed to update subscription:', updateError)
          } else {
            console.log(`Subscription updated for team ${teamId}: tier=${tier}, status=${subscription.status}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('Subscription updated:', subscription.id)
        
        // Find team by Stripe customer ID
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('team_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (existingSub) {
          // Determine tier from price ID or metadata
          const priceId = subscription.items.data[0]?.price.id
          const tier = TIER_MAP[priceId] || subscription.metadata?.tier || 'starter'
          
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              status: subscription.status,
              tier: tier,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('team_id', existingSub.team_id)

          if (updateError) {
            console.error('Failed to update subscription:', updateError)
          } else {
            console.log(`Subscription updated for team ${existingSub.team_id}: tier=${tier}, status=${subscription.status}`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('Subscription deleted:', subscription.id)
        
        // Find team by Stripe subscription ID
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('team_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (existingSub) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              tier: 'trial',  // Revert to trial tier
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq('team_id', existingSub.team_id)

          if (updateError) {
            console.error('Failed to update subscription:', updateError)
          } else {
            console.log(`Subscription canceled for team ${existingSub.team_id}`)
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment succeeded:', invoice.id)
        
        // Could update subscription status if needed
        if (invoice.subscription) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('team_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()

          if (existingSub) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('team_id', existingSub.team_id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment failed:', invoice.id)
        
        if (invoice.subscription) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('team_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()

          if (existingSub) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('team_id', existingSub.team_id)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook handler failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
