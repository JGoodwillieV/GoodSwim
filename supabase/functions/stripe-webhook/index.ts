// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events to sync subscription status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Map Stripe price IDs to tier names
// TODO: Replace with your actual Stripe Price IDs
const TIER_MAP: Record<string, string> = {
  [Deno.env.get('STRIPE_STARTER_PRICE_ID') || 'price_starter']: 'starter',
  [Deno.env.get('STRIPE_PRO_PRICE_ID') || 'price_pro']: 'pro',
  [Deno.env.get('STRIPE_CLUB_PRICE_ID') || 'price_club']: 'club',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Stripe configuration missing')
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the raw body and signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const teamId = session.metadata?.team_id
          const tier = session.metadata?.tier
          
          if (teamId && tier) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            
            await supabase
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
              }, {
                onConflict: 'team_id'
              })
            
            console.log(`Subscription created/updated for team ${teamId}: ${tier}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Find team by Stripe customer ID
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('team_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (existingSub) {
          // Determine tier from price ID
          const priceId = subscription.items.data[0]?.price.id
          const tier = TIER_MAP[priceId] || subscription.metadata?.tier || 'starter'
          
          await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              status: subscription.status,
              tier: tier,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('team_id', existingSub.team_id)
          
          console.log(`Subscription updated for team ${existingSub.team_id}: status=${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Find team by Stripe customer ID
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('team_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (existingSub) {
          // Mark subscription as canceled, revert to trial tier
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              tier: 'trial', // Revert to trial (will show as expired if trial_end passed)
              cancel_at_period_end: false,
            })
            .eq('team_id', existingSub.team_id)
          
          console.log(`Subscription canceled for team ${existingSub.team_id}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('team_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()

          if (existingSub) {
            // Update status to active on successful payment
            await supabase
              .from('subscriptions')
              .update({ status: 'active' })
              .eq('team_id', existingSub.team_id)
            
            console.log(`Payment succeeded for team ${existingSub.team_id}`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('team_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single()

          if (existingSub) {
            // Mark as past_due on failed payment
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('team_id', existingSub.team_id)
            
            console.log(`Payment failed for team ${existingSub.team_id}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook processing failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

