// src/hooks/usePushNotifications.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// IMPORTANT: Replace this with your actual VAPID public key
// Generate keys using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY_HERE';

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window &&
      'Notification' in window;
    
    setIsSupported(supported);

    // Load existing subscription if any
    if (supported) {
      loadExistingSubscription();
    }
  }, []);

  const loadExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
      }
    } catch (err) {
      console.error('[Push] Failed to load existing subscription:', err);
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if VAPID key is configured
      if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
        throw new Error('VAPID public key not configured. Please set VITE_VAPID_PUBLIC_KEY in your .env file.');
      }

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setIsLoading(false);
        return { 
          success: false, 
          reason: 'Permission denied by user' 
        };
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let pushSubscription = await registration.pushManager.getSubscription();

      // If no subscription exists, create one
      if (!pushSubscription) {
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Save subscription to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const subscriptionJson = pushSubscription.toJSON();

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
          device_name: getDeviceName(),
          last_used_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,endpoint' 
        });

      if (dbError) {
        throw dbError;
      }

      setSubscription(pushSubscription);
      setIsLoading(false);

      return { success: true };
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      setError(err.message);
      setIsLoading(false);
      return { 
        success: false, 
        reason: err.message 
      };
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const subscriptionJson = subscription.toJSON();
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscriptionJson.endpoint);
        }

        setSubscription(null);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
      setError(err.message);
      setIsLoading(false);
      return { 
        success: false, 
        reason: err.message 
      };
    }
  };

  const testNotification = async () => {
    try {
      // Show a test notification
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification('StormTracker Test', {
          body: 'Push notifications are working! 🎉',
          icon: '/icons/192.png',
          badge: '/icons/72.png',
          tag: 'test-notification',
          vibrate: [200, 100, 200]
        });

        return { success: true };
      }
    } catch (err) {
      console.error('[Push] Test notification failed:', err);
      return { 
        success: false, 
        reason: err.message 
      };
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    isSubscribed: subscription !== null,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testNotification
  };
}

// ===== HELPER FUNCTIONS =====

/**
 * Converts a base64 VAPID key to a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Gets a friendly device name based on user agent
 */
function getDeviceName() {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'Android Phone';
    return 'Android Tablet';
  }
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Desktop';
}

