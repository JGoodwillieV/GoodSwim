// supabase/functions/create-checkout/index.ts
// Creates Stripe Checkout session for subscription upgrades
// Supports both standard per-unit and metered pricing

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get('STRIPE_STARTER_PRICE_ID') || '',
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID') || '',
  club: Deno.env.get('STRIPE_CLUB_PRICE_ID') || '',
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

    const { teamId, tier, userId, swimmerCount, email } = await req.json()

    if (!teamId || !tier || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: teamId, tier, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['starter', 'pro', 'club'].includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be starter, pro, or club' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('team_id', teamId)
      .single()

    let customerId = existingSub?.stripe_customer_id

    if (!customerId) {
      let customerEmail = email
      if (!customerEmail) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        customerEmail = userData?.user?.email
      }

      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          team_id: teamId,
          user_id: userId,
        },
      })
      customerId = customer.id

      await supabase
        .from('subscriptions')
        .upsert({
          team_id: teamId,
          stripe_customer_id: customerId,
          status: 'incomplete',
          tier: 'trial',
        }, {
          onConflict: 'team_id'
        })
    }

    const priceId = PRICE_IDS[tier]
    if (!priceId) {
      console.error(`Price ID not configured for tier: ${tier}`)
      return new Response(
        JSON.stringify({ 
          error: 'Stripe products not configured. Please set up STRIPE_*_PRICE_ID environment variables.',
          details: `Missing price ID for tier: ${tier}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://goodswim.io'
    const successUrl = `${appUrl}/app?billing=success&tier=${tier}`
    const cancelUrl = `${appUrl}/app?billing=cancelled`

    // Count current swimmers for quantity
    const { count: currentSwimmerCount } = await supabase
      .from('swimmers')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)

    const quantity = Math.max(currentSwimmerCount || swimmerCount || 1, 1)

    // Check if the price is metered or standard by fetching price details
    let isMetered = false
    try {
      const price = await stripe.prices.retrieve(priceId)
      isMetered = price.recurring?.usage_type === 'metered' || price.billing_scheme === 'tiered'
    } catch (e) {
      console.warn('Could not determine price type, assuming standard:', e.message)
    }

    console.log(`Creating checkout: team=${teamId}, tier=${tier}, quantity=${quantity}, metered=${isMetered}`)

    // Build line items based on pricing type
    const lineItems: any[] = [{ price: priceId }]
    if (!isMetered) {
      lineItems[0].quantity = quantity
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          team_id: teamId,
          user_id: userId,
          tier: tier,
          swimmer_count: quantity.toString(),
        },
      },
      metadata: {
        team_id: teamId,
        user_id: userId,
        tier: tier,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    console.log(`Checkout session created: ${session.id} for team ${teamId}, tier ${tier}, quantity ${quantity}`)

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout session' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
