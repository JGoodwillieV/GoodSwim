// src/components/BillingSettings.jsx
// Billing dashboard for subscription management

import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useSubscription } from '../hooks/useSubscription';
import { 
  Check, 
  AlertTriangle, 
  CreditCard, 
  Zap, 
  Crown, 
  Star,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  Shield,
  RefreshCw
} from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$1',
    period: '/month',
    description: 'Perfect for individual coaches',
    icon: Star,
    color: 'emerald',
    features: [
      'Unlimited Swimmers',
      'Manual Results Entry',
      'Basic Calendar',
      'Read-Only Parent Portal',
      'Email Support'
    ],
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$3',
    period: '/month',
    description: 'For serious coaching programs',
    icon: Zap,
    color: 'blue',
    features: [
      'Everything in Starter',
      'SD3 & CSV Imports',
      'Practice Builder',
      'Trophy Case & Records',
      'Push Notifications',
      'Meet Reports',
      'Up to 3 Coaches'
    ],
    popular: true
  },
  {
    id: 'club',
    name: 'Club',
    price: '$5',
    period: '/month',
    description: 'Full-featured for clubs',
    icon: Crown,
    color: 'purple',
    features: [
      'Everything in Pro',
      'AI Video Analysis (10/mo)',
      'AI Chat Assistant',
      'Advanced Analytics',
      'Custom Branding',
      'Unlimited Coaches',
      'Priority Support'
    ],
    popular: false
  }
];

export default function BillingSettings() {
  const { subscription, tier, swimmerCount, limits, loading, trialDaysLeft, isTrialExpiringSoon, isTrial, isPaid, isExpired, refresh, teamId } = useSubscription();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  const handleUpgrade = async (planId) => {
    setProcessing(planId);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Call the Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: { 
          teamId, 
          tier: planId, 
          userId: user.id, 
          swimmerCount,
          email: user.email
        }
      });
      
      if (fnError) throw fnError;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing('portal');
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: fnError } = await supabase.functions.invoke('billing-portal', {
        body: { teamId, userId: user.id }
      });
      
      if (fnError) throw fnError;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError(err.message || 'Error opening billing portal.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const currentPlanIndex = PLANS.findIndex(p => p.id === tier);

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Billing & Subscription</h1>
          <p className="text-slate-500 mt-1">Manage your GoodSwim subscription and billing</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Current Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  isExpired ? 'bg-red-100' :
                  isTrial ? 'bg-amber-100' :
                  tier === 'club' ? 'bg-purple-100' :
                  tier === 'pro' ? 'bg-blue-100' :
                  'bg-emerald-100'
                }`}>
                  {isExpired ? <AlertTriangle className="w-6 h-6 text-red-600" /> :
                   isTrial ? <Clock className="w-6 h-6 text-amber-600" /> :
                   tier === 'club' ? <Crown className="w-6 h-6 text-purple-600" /> :
                   tier === 'pro' ? <Zap className="w-6 h-6 text-blue-600" /> :
                   <Star className="w-6 h-6 text-emerald-600" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isExpired ? 'Trial Expired' :
                     isTrial ? 'Free Trial' :
                     `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {isExpired ? 'Please upgrade to continue using GoodSwim' :
                     isTrial ? `${trialDaysLeft()} days remaining` :
                     subscription?.cancel_at_period_end ? 'Cancels at period end' :
                     'Active subscription'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Badge */}
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  isExpired ? 'bg-red-100 text-red-700' :
                  isTrial ? 'bg-amber-100 text-amber-700' :
                  subscription?.status === 'active' ? 'bg-green-100 text-green-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {isExpired ? 'Expired' :
                   isTrial ? 'Trial' :
                   subscription?.status?.charAt(0).toUpperCase() + subscription?.status?.slice(1)}
                </span>

                {/* Manage Button (for paid users) */}
                {isPaid && subscription?.stripe_customer_id && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={processing === 'portal'}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CreditCard size={18} />
                    {processing === 'portal' ? 'Loading...' : 'Manage Billing'}
                  </button>
                )}
              </div>
            </div>

            {/* Trial Warning Banner */}
            {(isTrialExpiringSoon() || isExpired) && (
              <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
                isExpired ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="flex-1">
                  <p className={`font-medium ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
                    {isExpired ? 'Your trial has expired' : 'Your trial is ending soon'}
                  </p>
                  <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                    {isExpired 
                      ? 'Upgrade now to keep access to your team data and features.'
                      : `Only ${trialDaysLeft()} days left. Upgrade now to avoid interruption.`}
                  </p>
                </div>
              </div>
            )}

            {/* Current Usage Stats */}
            {limits && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Swimmers</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {swimmerCount}
                    <span className="text-sm text-slate-400 font-normal">
                      /{limits.max_swimmers || '∞'}
                    </span>
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Coaches</p>
                  <p className="text-2xl font-bold text-slate-900">
                    1
                    <span className="text-sm text-slate-400 font-normal">
                      /{limits.max_coaches || '∞'}
                    </span>
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">AI Analysis</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {limits.ai_video_analysis ? `0/${limits.ai_video_monthly_limit}` : '—'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Data Imports</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {limits.sd3_import ? '✓' : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Plans */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {isPaid ? 'Change Plan' : 'Choose a Plan'}
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, index) => {
              const isCurrent = tier === plan.id;
              const isDowngrade = isPaid && index < currentPlanIndex;
              const IconComponent = plan.icon;
              
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                    plan.popular ? 'border-blue-500 shadow-lg shadow-blue-500/10' :
                    isCurrent ? 'border-slate-300' :
                    'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}

                  <div className="p-6">
                    {/* Plan Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${
                        plan.color === 'purple' ? 'bg-purple-100' :
                        plan.color === 'blue' ? 'bg-blue-100' :
                        'bg-emerald-100'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          plan.color === 'purple' ? 'text-purple-600' :
                          plan.color === 'blue' ? 'text-blue-600' :
                          'text-emerald-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{plan.name}</h4>
                        <p className="text-xs text-slate-500">{plan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                      <span className="text-slate-500">{plan.period}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            plan.color === 'purple' ? 'text-purple-500' :
                            plan.color === 'blue' ? 'text-blue-500' :
                            'text-emerald-500'
                          }`} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <button
                      onClick={() => !isCurrent && !isDowngrade && handleUpgrade(plan.id)}
                      disabled={processing === plan.id || isCurrent || isDowngrade}
                      className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                        isCurrent 
                          ? 'bg-slate-100 text-slate-500 cursor-default' :
                        isDowngrade
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed' :
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' :
                          'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {processing === plan.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : isDowngrade ? (
                        'Contact Support'
                      ) : (
                        <>
                          Upgrade to {plan.name}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ / Info Section */}
        <div className="bg-slate-50 rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-600" />
            Billing FAQ
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-1">When will I be charged?</h4>
              <p className="text-sm text-slate-600">
                You'll be charged immediately upon upgrading. Your subscription renews monthly.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Can I cancel anytime?</h4>
              <p className="text-sm text-slate-600">
                Yes! Cancel anytime from the billing portal. You'll keep access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">What happens to my data?</h4>
              <p className="text-sm text-slate-600">
                Your data is safe. If you downgrade or cancel, you keep read access to your existing data.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Need a different plan?</h4>
              <p className="text-sm text-slate-600">
                Contact us at support@goodswim.app for custom pricing for larger organizations.
              </p>
            </div>
          </div>
        </div>

        {/* Secure Payment Notice */}
        <div className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Secure payment powered by Stripe
        </div>
      </div>
    </div>
  );
}

