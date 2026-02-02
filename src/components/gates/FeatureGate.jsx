// src/components/gates/FeatureGate.jsx
// Wrapper component for feature gating based on subscription tier

import React, { createContext, useContext } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { FEATURES, tierHasFeature, getTierDisplayName } from '../../config/features';
import LockedOverlay from './LockedOverlay';
import UpgradePrompt from './UpgradePrompt';

// Context for nested feature gate info
const FeatureGateContext = createContext(null);

/**
 * Hook to check feature access in child components
 */
export function useFeatureGate(featureKey) {
  const { tier, hasFeature, loading } = useSubscription();
  const feature = FEATURES[featureKey];
  
  // Debug logging (remove in production)
  console.log(`[FeatureGate] Checking "${featureKey}": tier=${tier}, loading=${loading}`);
  
  if (!feature) {
    console.warn(`[FeatureGate] Unknown feature key: ${featureKey}`);
    return { isUnlocked: true, requiredTier: null, feature: null, loading };
  }
  
  const isUnlocked = tierHasFeature(tier, featureKey);
  
  console.log(`[FeatureGate] "${featureKey}" requires "${feature.requiredTier}", user has "${tier}", isUnlocked=${isUnlocked}`);
  
  return {
    isUnlocked,
    requiredTier: feature.requiredTier,
    requiredTierDisplay: getTierDisplayName(feature.requiredTier),
    feature,
    currentTier: tier,
    loading
  };
}

/**
 * FeatureGate Component
 * 
 * Modes:
 * - 'replace' (default): Shows UpgradePrompt instead of children when locked
 * - 'overlay': Shows children with a semi-transparent locked overlay
 * - 'hide': Completely hides children when locked
 * - 'disable': Renders children but passes isLocked prop
 * 
 * @param {string} feature - Feature key from FEATURES config
 * @param {string} mode - How to display locked state
 * @param {React.ReactNode} children - Content to gate
 * @param {React.ReactNode} fallback - Custom fallback for 'replace' mode
 * @param {string} className - Additional CSS classes
 */
export default function FeatureGate({ 
  feature: featureKey, 
  mode = 'replace',
  children, 
  fallback,
  className = '',
  compact = false
}) {
  const { tier, loading } = useSubscription();
  const feature = FEATURES[featureKey];
  
  // If feature doesn't exist, render children (fail open for development)
  if (!feature) {
    console.warn(`FeatureGate: Unknown feature key "${featureKey}"`);
    return <>{children}</>;
  }
  
  // Show loading state
  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-100 rounded-xl min-h-[100px] ${className}`} />
    );
  }
  
  const isUnlocked = tierHasFeature(tier, featureKey);
  
  // If unlocked, just render children
  if (isUnlocked) {
    return (
      <FeatureGateContext.Provider value={{ feature, isUnlocked: true }}>
        {children}
      </FeatureGateContext.Provider>
    );
  }
  
  // Handle different modes for locked state
  switch (mode) {
    case 'hide':
      return null;
      
    case 'overlay':
      return (
        <FeatureGateContext.Provider value={{ feature, isUnlocked: false }}>
          <div className={`relative ${className}`}>
            {children}
            <LockedOverlay feature={feature} compact={compact} />
          </div>
        </FeatureGateContext.Provider>
      );
      
    case 'disable':
      // For 'disable' mode, we pass the locked state to children
      // Children should check useFeatureGate or accept isLocked prop
      return (
        <FeatureGateContext.Provider value={{ feature, isUnlocked: false }}>
          <div className={`opacity-60 pointer-events-none ${className}`}>
            {children}
          </div>
        </FeatureGateContext.Provider>
      );
      
    case 'replace':
    default:
      // Show custom fallback or default UpgradePrompt
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <UpgradePrompt 
          feature={feature} 
          compact={compact}
          className={className}
        />
      );
  }
}

// Export context hook for advanced use cases
export function useFeatureGateContext() {
  return useContext(FeatureGateContext);
}

