// src/components/gates/UsageLimitBanner.jsx
// Banner component showing usage limits and progress

import React from 'react';
import { AlertTriangle, ArrowRight, Users, Video, UserCog } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { USAGE_LIMITS, getTierDisplayName } from '../../config/features';

/**
 * Get icon for limit type
 */
function getLimitIcon(limitKey) {
  switch (limitKey) {
    case 'max_swimmers':
      return Users;
    case 'max_coaches':
      return UserCog;
    case 'ai_video_monthly':
      return Video;
    default:
      return Users;
  }
}

/**
 * Get friendly label for limit type
 */
function getLimitLabel(limitKey) {
  switch (limitKey) {
    case 'max_swimmers':
      return 'swimmers';
    case 'max_coaches':
      return 'coaches';
    case 'ai_video_monthly':
      return 'AI analyses this month';
    default:
      return limitKey;
  }
}

/**
 * UsageLimitBanner Component
 * 
 * Shows usage progress for limits like swimmers, AI analyses, etc.
 * 
 * @param {string} limitKey - Key from USAGE_LIMITS (max_swimmers, ai_video_monthly, etc.)
 * @param {number} currentUsage - Current count of the limited resource
 * @param {boolean} showWhenUnderLimit - Show banner even when under limit
 * @param {string} variant - 'default' | 'warning' | 'compact'
 */
export default function UsageLimitBanner({ 
  limitKey,
  currentUsage = 0,
  showWhenUnderLimit = false,
  variant = 'default'
}) {
  const { tier } = useSubscription();
  const limit = USAGE_LIMITS[tier]?.[limitKey];
  
  // If unlimited (null), don't show anything
  if (limit === null) {
    return null;
  }
  
  // If at 0 limit and no usage, show locked message
  if (limit === 0) {
    return <LockedLimitBanner limitKey={limitKey} variant={variant} />;
  }
  
  const percentUsed = Math.min((currentUsage / limit) * 100, 100);
  const isAtLimit = currentUsage >= limit;
  const isNearLimit = percentUsed >= 80;
  
  // Don't show if under limit and showWhenUnderLimit is false
  if (!showWhenUnderLimit && !isNearLimit && !isAtLimit) {
    return null;
  }
  
  const Icon = getLimitIcon(limitKey);
  const label = getLimitLabel(limitKey);

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm ${
        isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-500'
      }`}>
        <Icon size={14} />
        <span>{currentUsage}/{limit} {label}</span>
        {isAtLimit && (
          <button onClick={handleUpgrade} className="text-blue-600 hover:underline text-xs font-medium">
            Upgrade
          </button>
        )}
      </div>
    );
  }

  if (variant === 'warning' || isAtLimit) {
    return (
      <div className={`p-4 rounded-xl flex items-start gap-3 ${
        isAtLimit 
          ? 'bg-red-50 border border-red-200' 
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isAtLimit ? 'text-red-500' : 'text-amber-500'
        }`} />
        <div className="flex-1">
          <p className={`font-medium ${isAtLimit ? 'text-red-800' : 'text-amber-800'}`}>
            {isAtLimit 
              ? `You've reached your ${label} limit`
              : `Approaching ${label} limit`}
          </p>
          <p className={`text-sm ${isAtLimit ? 'text-red-600' : 'text-amber-600'}`}>
            Using {currentUsage} of {limit} {label}.
            {isAtLimit 
              ? ' Upgrade to add more.'
              : ` ${limit - currentUsage} remaining.`}
          </p>
        </div>
        <button
          onClick={handleUpgrade}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isAtLimit
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          Upgrade
        </button>
      </div>
    );
  }

  // Default: progress bar style
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-500" />
          <span className="font-medium text-slate-700 capitalize">{label}</span>
        </div>
        <span className="text-sm text-slate-500">
          {currentUsage} / {limit}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isAtLimit ? 'bg-red-500' : 
            isNearLimit ? 'bg-amber-500' : 
            'bg-blue-500'
          }`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      
      {isNearLimit && (
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${isAtLimit ? 'text-red-600' : 'text-amber-600'}`}>
            {isAtLimit 
              ? 'Limit reached! Upgrade to continue.' 
              : `${limit - currentUsage} remaining`}
          </p>
          <button 
            onClick={handleUpgrade}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Upgrade <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Banner for features with 0 limit (completely locked)
 */
function LockedLimitBanner({ limitKey, variant }) {
  const { tier } = useSubscription();
  const label = getLimitLabel(limitKey);
  
  // Find which tier unlocks this
  const unlocksAt = Object.entries(USAGE_LIMITS).find(([t, limits]) => {
    return limits[limitKey] !== 0 && limits[limitKey] !== null;
  })?.[0] || 'pro';

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <AlertTriangle size={14} />
        <span>{label} not available on {getTierDisplayName(tier)}</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
      <div>
        <p className="font-medium text-slate-700">
          {label.charAt(0).toUpperCase() + label.slice(1)} not included
        </p>
        <p className="text-sm text-slate-500">
          Upgrade to {getTierDisplayName(unlocksAt)} to unlock
        </p>
      </div>
      <button
        onClick={handleUpgrade}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
      >
        Upgrade <ArrowRight size={14} />
      </button>
    </div>
  );
}

