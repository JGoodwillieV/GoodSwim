// src/hooks/useBadgeCount.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useBadgeCount() {
  const [badgeCount, setBadgeCount] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  // Define functions BEFORE useEffect so they can be called
  const updateBadge = async (count) => {
    setBadgeCount(count);

    if (!isSupported) {
      console.log('[Badge] Badge API not supported');
      return;
    }

    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log('[Badge] Set to:', count);
      } else {
        await navigator.clearAppBadge();
        console.log('[Badge] Cleared');
      }
    } catch (err) {
      console.error('[Badge] Failed to update:', err);
    }
  };

  const loadBadgeCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_badge_counts')
        .select('unread_count')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        updateBadge(data.unread_count || 0);
      }
    } catch (err) {
      // Silently fail if table doesn't exist yet
      console.log('[Badge] Table not available yet:', err.message);
    }
  };

  const clearBadge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call database function to clear badge
      const { error } = await supabase.rpc('clear_badge_count', {
        p_user_id: user.id
      });

      if (error) {
        // If function doesn't exist yet, just clear locally
        console.log('[Badge] Database function not available yet');
        updateBadge(0);
        return;
      }

      // Update local state and native badge
      updateBadge(0);
    } catch (err) {
      console.log('[Badge] Failed to clear:', err.message);
      // Still clear locally even if database fails
      updateBadge(0);
    }
  };

  const incrementBadge = async (amount = 1) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Increment in database
      const { error } = await supabase.rpc('increment_badge_counts', {
        user_ids: [user.id]
      });

      if (error) {
        console.error('[Badge] Failed to increment:', error);
        return;
      }

      // Update will come through realtime subscription
    } catch (err) {
      console.error('[Badge] Failed to increment:', err);
    }
  };

  useEffect(() => {
    // Check if Badge API is supported
    const supported = 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
    setIsSupported(supported);

    // Load initial badge count (fails gracefully if table doesn't exist)
    loadBadgeCount();

    // Subscribe to realtime updates (only if table exists)
    let subscription;
    try {
      subscription = supabase
        .channel('badge-count-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_badge_counts',
            filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data.user?.id)}`
          },
          (payload) => {
            console.log('[Badge] Count updated:', payload);
            if (payload.new) {
              updateBadge(payload.new.unread_count || 0);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.log('[Badge] Realtime subscription not available yet');
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Functions are defined above, safe to call

  return {
    badgeCount,
    isSupported,
    clearBadge,
    incrementBadge,
    setBadge: updateBadge
  };
}

