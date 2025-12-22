// supabase/functions/create-checkout/index.ts
// Creates Stripe Checkout session for subscription upgrades

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Price IDs from your Stripe Dashboard
// TODO: Replace with your actual Stripe Price IDs after creating products
const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get('STRIPE_STARTER_PRICE_ID') || 'price_starter',
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID') || 'price_pro',
  club: Deno.env.get('STRIPE_CLUB_PRICE_ID') || 'price_club',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { teamId, tier, userId, swimmerCount, email } = await req.json()

    if (!teamId || !tier || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: teamId, tier, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate tier
    if (!['starter', 'pro', 'club'].includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be starter, pro, or club' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('team_id', teamId)
      .single()

    let customerId = existingSub?.stripe_customer_id

    // Create or retrieve Stripe customer
    if (!customerId) {
      // Get user email from Supabase auth if not provided
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

      // Update subscription record with customer ID
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

    // Get the price ID for the selected tier
    const priceId = PRICE_IDS[tier]
    if (!priceId || priceId.startsWith('price_')) {
      // If using placeholder price IDs, return error
      console.error(`Price ID not configured for tier: ${tier}`)
      return new Response(
        JSON.stringify({ 
          error: 'Stripe products not configured. Please set up STRIPE_*_PRICE_ID environment variables.',
          details: `Missing price ID for tier: ${tier}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine success/cancel URLs
    const appUrl = Deno.env.get('APP_URL') || 'https://goodswim.io'
    const successUrl = `${appUrl}/app?billing=success&tier=${tier}`
    const cancelUrl = `${appUrl}/app?billing=cancelled`

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          team_id: teamId,
          user_id: userId,
          tier: tier,
          swimmer_count: swimmerCount?.toString() || '0',
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

    console.log(`Checkout session created: ${session.id} for team ${teamId}, tier ${tier}`)

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

