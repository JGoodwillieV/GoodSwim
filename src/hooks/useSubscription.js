// src/hooks/useSubscription.js
// Subscription management hook for Stripe billing integration

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../supabase';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children, teamId }) {
  const [subscription, setSubscription] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swimmerCount, setSwimmerCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        
        // 1. Get Subscription Status
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('team_id', teamId)
          .single();

        // Handle no subscription (create default trial)
        if (subError && subError.code === 'PGRST116') {
          // No subscription exists - use trial defaults
          const defaultSub = {
            team_id: teamId,
            status: 'trialing',
            tier: 'trial',
            trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            effectiveTier: 'trial'
          };
          setSubscription(defaultSub);
          
          // Fetch trial limits
          const { data: trialLimits } = await supabase
            .from('feature_limits')
            .select('*')
            .eq('tier', 'trial')
            .single();
          
          setLimits(trialLimits);
          
          // Get swimmer count
          const { count } = await supabase
            .from('swimmers')
            .select('id', { count: 'exact', head: true })
            .eq('coach_id', teamId);
          
          setSwimmerCount(count || 0);
          setLoading(false);
          return;
        }

        if (subError) {
          console.error('Subscription fetch error:', subError);
          setError(subError.message);
          setLoading(false);
          return;
        }

        // 2. Determine Effective Tier (Handle Expired Trials)
        let effectiveTier = sub?.tier || 'trial';
        
        if (effectiveTier === 'trial' && sub?.trial_end) {
          if (new Date(sub.trial_end) < new Date()) {
            effectiveTier = 'expired';
          }
        }
        
        // Handle cancelled/unpaid states
        if (['canceled', 'unpaid', 'past_due'].includes(sub?.status)) {
          effectiveTier = 'expired';
        }

        setSubscription({ ...sub, effectiveTier });

        // 3. Get Feature Limits for this Tier
        // If expired, fall back to 'trial' limits (most restricted)
        const queryTier = effectiveTier === 'expired' ? 'trial' : effectiveTier;

        const { data: tierLimits, error: limitsError } = await supabase
          .from('feature_limits')
          .select('*')
          .eq('tier', queryTier)
          .single();

        if (limitsError) {
          console.error('Feature limits fetch error:', limitsError);
        } else {
          setLimits(tierLimits);
        }

        // 4. Get Current Swimmer Count (for limits checking)
        const { count } = await supabase
          .from('swimmers')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', teamId);

        setSwimmerCount(count || 0);
        setLoading(false);

      } catch (err) {
        console.error('Subscription hook error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for updates
    const channel = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          // Refetch on any subscription change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [teamId]);

  // Helper: Check if a specific feature is available
  const hasFeature = useCallback((featureName) => {
    if (!limits) return false;
    if (subscription?.effectiveTier === 'expired') return false;
    return limits[featureName] === true;
  }, [limits, subscription]);

  // Helper: Check if user can add another swimmer
  const canAddSwimmer = useCallback(() => {
    if (!limits) return false;
    if (subscription?.effectiveTier === 'expired') return false;
    if (limits.max_swimmers === null) return true; // Unlimited
    return swimmerCount < limits.max_swimmers;
  }, [limits, subscription, swimmerCount]);

  // Helper: Get remaining swimmers that can be added
  const remainingSwimmers = useCallback(() => {
    if (!limits) return 0;
    if (limits.max_swimmers === null) return Infinity;
    return Math.max(0, limits.max_swimmers - swimmerCount);
  }, [limits, swimmerCount]);

  // Helper: Calculate days left in trial
  const trialDaysLeft = useCallback(() => {
    if (!subscription?.trial_end) return 0;
    if (subscription.tier !== 'trial') return 0;
    
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [subscription]);

  // Helper: Check if trial is expiring soon (within 3 days)
  const isTrialExpiringSoon = useCallback(() => {
    const daysLeft = trialDaysLeft();
    return subscription?.tier === 'trial' && daysLeft > 0 && daysLeft <= 3;
  }, [subscription, trialDaysLeft]);

  // Refresh subscription data
  const refresh = useCallback(async () => {
    if (!teamId) return;
    
    setLoading(true);
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('team_id', teamId)
      .single();
    
    if (sub) {
      let effectiveTier = sub.tier;
      if (effectiveTier === 'trial' && sub.trial_end && new Date(sub.trial_end) < new Date()) {
        effectiveTier = 'expired';
      }
      if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
        effectiveTier = 'expired';
      }
      setSubscription({ ...sub, effectiveTier });
    }
    setLoading(false);
  }, [teamId]);

  const value = {
    subscription,
    limits,
    loading,
    error,
    swimmerCount,
    hasFeature,
    canAddSwimmer,
    remainingSwimmers,
    trialDaysLeft,
    isTrialExpiringSoon,
    refresh,
    tier: subscription?.effectiveTier || 'trial',
    isPaid: ['starter', 'pro', 'club'].includes(subscription?.effectiveTier),
    isExpired: subscription?.effectiveTier === 'expired',
    isTrial: subscription?.tier === 'trial' && subscription?.effectiveTier !== 'expired'
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return safe defaults when used outside provider
    return {
      subscription: null,
      limits: null,
      loading: true,
      error: null,
      swimmerCount: 0,
      hasFeature: () => false,
      canAddSwimmer: () => true,
      remainingSwimmers: () => Infinity,
      trialDaysLeft: () => 14,
      isTrialExpiringSoon: () => false,
      refresh: () => {},
      tier: 'trial',
      isPaid: false,
      isExpired: false,
      isTrial: true
    };
  }
  return context;
};

export default useSubscription;

