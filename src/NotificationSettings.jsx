// src/NotificationSettings.jsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Check, X, Loader2, TestTube, Clock } from 'lucide-react';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useBadgeCount } from './hooks/useBadgeCount';
import { supabase } from './supabase';

export default function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
    testNotification
  } = usePushNotifications();

  const { badgeCount, isSupported: badgeSupported, clearBadge } = useBadgeCount();

  const [preferences, setPreferences] = useState({
    daily_brief: true,
    action_items: true,
    meet_reminders: true,
    meet_results: true,
    test_set_results: true,
    practice_updates: true,
    quiet_hours_start: null,
    quiet_hours_end: null
  });

  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
    setIsStandalone(standalone);

    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setPreferences({
          daily_brief: data.daily_brief ?? true,
          action_items: data.action_items ?? true,
          meet_reminders: data.meet_reminders ?? true,
          meet_results: data.meet_results ?? true,
          test_set_results: data.test_set_results ?? true,
          practice_updates: data.practice_updates ?? true,
          quiet_hours_start: data.quiet_hours_start || null,
          quiet_hours_end: data.quiet_hours_end || null
        });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const savePreferences = async (updatedPreferences) => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPreferences
        });

      if (error) throw error;

      setPreferences(updatedPreferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreference = (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    savePreferences(updated);
  };

  const handleQuietHoursChange = (type, value) => {
    const updated = { ...preferences, [`quiet_hours_${type}`]: value || null };
    savePreferences(updated);
  };

  const handleEnableNotifications = async () => {
    const result = await subscribe();
    if (result.success) {
      // Optionally show a success message
      console.log('✅ Notifications enabled successfully!');
    }
  };

  const handleDisableNotifications = async () => {
    if (confirm('Are you sure you want to disable push notifications?')) {
      const result = await unsubscribe();
      if (result.success) {
        console.log('✅ Notifications disabled successfully!');
      }
    }
  };

  const handleTestNotification = async () => {
    const result = await testNotification();
    if (result.success) {
      alert('Test notification sent! Check your notifications.');
    } else {
      alert(`Failed to send test notification: ${result.reason}`);
    }
  };

  if (!isSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <BellOff className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-900 mb-2">
            Push Notifications Not Supported
          </h3>
          <p className="text-amber-700 text-sm">
            Your browser doesn't support push notifications. Try using Chrome, Edge, or Safari on iOS 16.4+.
          </p>
        </div>
      </div>
    );
  }

  if (preferencesLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Notification Settings
        </h2>
        <p className="text-slate-600 text-sm">
          Manage your push notification preferences and stay updated on important team activities.
        </p>
      </div>

      {/* iOS Installation Warning */}
      {isIOS && !isStandalone && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 text-sm mb-1">
                Install App First
              </h4>
              <p className="text-blue-700 text-xs leading-relaxed">
                On iOS, you must add StormTracker to your home screen before enabling notifications.
                Tap the Share button and select "Add to Home Screen".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enable/Disable Push Notifications */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {isSubscribed ? (
              <Bell className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <BellOff className="w-6 h-6 text-slate-400 mt-1" />
            )}
            <div>
              <h3 className="font-bold text-slate-900">Push Notifications</h3>
              <p className="text-slate-600 text-sm mt-1">
                {isSubscribed 
                  ? 'Notifications are enabled. You\'ll receive updates about team activities.'
                  : 'Enable notifications to stay updated on important team events.'}
              </p>
              {badgeSupported && (
                <p className="text-slate-500 text-xs mt-2">
                  Badge count: <span className="font-semibold">{badgeCount}</span>
                  {badgeCount > 0 && (
                    <button
                      onClick={clearBadge}
                      className="ml-2 text-sky-600 hover:text-sky-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>

          {isSubscribed ? (
            <button
              onClick={handleDisableNotifications}
              disabled={pushLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Disable'
              )}
            </button>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={pushLoading || permission === 'denied'}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enable'
              )}
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <p className="text-red-800 font-medium">Notifications Blocked</p>
            <p className="text-red-600 text-xs mt-1">
              You've blocked notifications. Please enable them in your browser settings.
            </p>
          </div>
        )}

        {pushError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-xs mt-1">{pushError}</p>
          </div>
        )}

        {isSubscribed && (
          <button
            onClick={handleTestNotification}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
          >
            <TestTube className="w-3.5 h-3.5" />
            Send Test Notification
          </button>
        )}
      </div>

      {/* Notification Preferences */}
      {isSubscribed && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-700" />
            What notifications do you want?
          </h3>

          {saveSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-800 font-medium">Preferences saved!</span>
            </div>
          )}

          <div className="space-y-3">
            <NotificationToggle
              label="Daily Brief Posts"
              description="New announcements and updates from coaches"
              checked={preferences.daily_brief}
              onChange={() => handleTogglePreference('daily_brief')}
              disabled={saving}
            />
            <NotificationToggle
              label="Action Items"
              description="Meet confirmations, forms, and tasks requiring your attention"
              checked={preferences.action_items}
              onChange={() => handleTogglePreference('action_items')}
              disabled={saving}
            />
            <NotificationToggle
              label="Meet Reminders"
              description="Upcoming meet reminders and schedule changes"
              checked={preferences.meet_reminders}
              onChange={() => handleTogglePreference('meet_reminders')}
              disabled={saving}
            />
            <NotificationToggle
              label="Meet Results"
              description="When new meet results are uploaded"
              checked={preferences.meet_results}
              onChange={() => handleTogglePreference('meet_results')}
              disabled={saving}
            />
            <NotificationToggle
              label="Test Set Results"
              description="When new test set times are recorded"
              checked={preferences.test_set_results}
              onChange={() => handleTogglePreference('test_set_results')}
              disabled={saving}
            />
            <NotificationToggle
              label="Practice Updates"
              description="Practice schedule changes and updates"
              checked={preferences.practice_updates}
              onChange={() => handleTogglePreference('practice_updates')}
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* Quiet Hours */}
      {isSubscribed && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-700" />
            Quiet Hours
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Don't receive notifications during these hours (optional)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_start || ''}
                onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_end || ''}
                onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
              />
            </div>
          </div>

          {preferences.quiet_hours_start && preferences.quiet_hours_end && (
            <p className="text-slate-500 text-xs mt-3">
              Notifications will be silenced from {preferences.quiet_hours_start} to {preferences.quiet_hours_end}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for notification toggles
function NotificationToggle({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-slate-900 text-sm">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-sky-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

