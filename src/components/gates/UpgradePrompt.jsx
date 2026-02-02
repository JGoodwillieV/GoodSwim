// src/components/gates/UpgradePrompt.jsx
// Upgrade CTA component for locked features

import React from 'react';
import { Lock, Sparkles, ArrowRight, Crown, Zap, Star } from 'lucide-react';
import { getTierDisplayName, TIERS } from '../../config/features';
import Icon from '../Icon';

/**
 * Get tier-specific styling
 */
function getTierStyle(tier) {
  switch (tier) {
    case TIERS.CLUB:
      return {
        gradient: 'from-purple-500 to-indigo-600',
        bgLight: 'bg-purple-50',
        textColor: 'text-purple-600',
        borderColor: 'border-purple-200',
        icon: Crown
      };
    case TIERS.PRO:
      return {
        gradient: 'from-blue-500 to-cyan-600',
        bgLight: 'bg-blue-50',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-200',
        icon: Zap
      };
    case TIERS.STARTER:
      return {
        gradient: 'from-emerald-500 to-teal-600',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
        icon: Star
      };
    default:
      return {
        gradient: 'from-slate-500 to-slate-600',
        bgLight: 'bg-slate-50',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-200',
        icon: Lock
      };
  }
}

/**
 * UpgradePrompt Component
 * 
 * Displays an upgrade prompt for a locked feature
 * 
 * @param {Object} feature - Feature config from FEATURES
 * @param {boolean} compact - Show compact version
 * @param {string} className - Additional CSS classes
 * @param {Function} onUpgrade - Optional custom upgrade handler
 */
export default function UpgradePrompt({ 
  feature, 
  compact = false,
  className = '',
  onUpgrade 
}) {
  const style = getTierStyle(feature.requiredTier);
  const TierIcon = style.icon;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Dispatch navigation event to billing
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-white border ${style.borderColor} rounded-xl ${className}`}>
        <div className={`p-2 ${style.bgLight} rounded-lg`}>
          <Lock size={18} className={style.textColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{feature.label}</p>
          <p className="text-xs text-slate-500">{getTierDisplayName(feature.requiredTier)} feature</p>
        </div>
        <button
          onClick={handleUpgrade}
          className={`px-3 py-1.5 bg-gradient-to-r ${style.gradient} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1`}
        >
          Upgrade
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-dashed ${style.borderColor} rounded-2xl p-8 text-center ${className}`}>
      {/* Icon */}
      <div className={`w-16 h-16 ${style.bgLight} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
        {feature.icon ? (
          <Icon name={feature.icon} size={28} className={style.textColor} />
        ) : (
          <Lock size={28} className={style.textColor} />
        )}
      </div>

      {/* Feature Name */}
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {feature.label}
      </h3>

      {/* Description */}
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        {feature.description}
      </p>

      {/* Tier Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium text-slate-600 mb-6">
        <TierIcon size={14} />
        Available on {getTierDisplayName(feature.requiredTier)}
      </div>

      {/* Upgrade Button */}
      <div>
        <button
          onClick={handleUpgrade}
          className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${style.gradient} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105`}
        >
          <Sparkles size={18} />
          Upgrade to {getTierDisplayName(feature.requiredTier)}
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Subtle link */}
      <p className="mt-4 text-sm text-slate-400">
        View all plans on the{' '}
        <button onClick={handleUpgrade} className="text-blue-500 hover:underline">
          Billing page
        </button>
      </p>
    </div>
  );
}

/**
 * Inline upgrade badge for buttons/links
 */
export function UpgradeBadge({ tier, size = 'sm' }) {
  const style = getTierStyle(tier);
  const TierIcon = style.icon;
  
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5'
  };
  
  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} ${style.bgLight} ${style.textColor} rounded-full font-medium`}>
      <TierIcon size={size === 'xs' ? 10 : size === 'sm' ? 12 : 14} />
      {getTierDisplayName(tier)}
    </span>
  );
}

