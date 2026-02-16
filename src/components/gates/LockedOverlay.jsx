// src/components/gates/LockedOverlay.jsx
// Semi-transparent overlay for locked feature sections

import React from 'react';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { getTierDisplayName } from '../../config/features';

/**
 * LockedOverlay Component
 * 
 * Displays a semi-transparent overlay over locked content
 * with an upgrade CTA button
 * 
 * @param {Object} feature - Feature config from FEATURES
 * @param {boolean} compact - Show compact version
 * @param {Function} onUpgrade - Optional custom upgrade handler
 */
export default function LockedOverlay({ 
  feature, 
  compact = false,
  onUpgrade 
}) {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Navigate to billing page
      window.location.hash = '#billing';
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
    }
  };

  if (compact) {
    return (
      <div className="absolute inset-0 bg-slate-900/25 rounded-xl flex items-center justify-center z-10">
        <div className="text-center p-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg shadow-lg text-sm font-medium text-slate-700">
            <Lock size={14} className="text-slate-500" />
            <span>{getTierDisplayName(feature.requiredTier)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/35 rounded-xl flex items-center justify-center z-10">
      <div className="text-center p-6 max-w-sm">
        {/* Lock Icon */}
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
          <Lock size={24} className="text-white" />
        </div>
        
        {/* Feature Info */}
        <h3 className="text-white font-bold text-lg mb-1">
          {feature.label}
        </h3>
        <p className="text-white/70 text-sm mb-4">
          {feature.description}
        </p>
        
        {/* Upgrade Button */}
        <button
          onClick={handleUpgrade}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
        >
          <Sparkles size={16} />
          Upgrade to {getTierDisplayName(feature.requiredTier)}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

