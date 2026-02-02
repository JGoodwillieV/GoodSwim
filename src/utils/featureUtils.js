// src/utils/featureUtils.js
// Helper functions for feature flag system

import { FEATURES, TIER_HIERARCHY, USAGE_LIMITS, tierHasFeature } from '../config/features';

/**
 * Get all features grouped by category
 */
export function getFeaturesByCategory() {
  const categories = {};
  Object.values(FEATURES).forEach(feature => {
    if (!categories[feature.category]) {
      categories[feature.category] = [];
    }
    categories[feature.category].push(feature);
  });
  return categories;
}

/**
 * Compare two tiers
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareTiers(tierA, tierB) {
  const indexA = TIER_HIERARCHY.indexOf(tierA);
  const indexB = TIER_HIERARCHY.indexOf(tierB);

  if (indexA < indexB) return -1;
  if (indexA > indexB) return 1;
  return 0;
}

/**
 * Get the tier difference display text
 */
export function getTierUpgradeText(currentTier, requiredTier) {
  const current = TIER_HIERARCHY.indexOf(currentTier);
  const required = TIER_HIERARCHY.indexOf(requiredTier);

  if (current >= required) return null;

  const tierNames = {
    starter: 'Starter',
    pro: 'Pro',
    club: 'Club'
  };

  return `Upgrade to ${tierNames[requiredTier]}`;
}

/**
 * Calculate what percentage of features a tier has access to
 */
export function getTierFeaturePercentage(tier) {
  const allFeatures = Object.keys(FEATURES).length;
  const availableFeatures = Object.keys(FEATURES).filter(key => 
    tierHasFeature(tier, key)
  ).length;

  return Math.round((availableFeatures / allFeatures) * 100);
}

/**
 * Get a comparison matrix of features across tiers
 */
export function getFeatureComparisonMatrix() {
  return Object.values(FEATURES).map(feature => ({
    ...feature,
    tiers: {
      trial: tierHasFeature('trial', feature.key),
      starter: tierHasFeature('starter', feature.key),
      pro: tierHasFeature('pro', feature.key),
      club: tierHasFeature('club', feature.key)
    }
  }));
}

/**
 * Get all features available for a specific tier
 */
export function getFeaturesForTier(tier) {
  return Object.values(FEATURES).filter(feature => 
    tierHasFeature(tier, feature.key)
  );
}

/**
 * Get all locked features for a specific tier
 */
export function getLockedFeaturesForTier(tier) {
  return Object.values(FEATURES).filter(feature => 
    !tierHasFeature(tier, feature.key)
  );
}

/**
 * Get the next tier that unlocks more features
 */
export function getNextTierWithMoreFeatures(currentTier) {
  const currentIndex = TIER_HIERARCHY.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= TIER_HIERARCHY.length - 1) {
    return null;
  }
  
  // Return the next non-expired tier
  for (let i = currentIndex + 1; i < TIER_HIERARCHY.length; i++) {
    const nextTier = TIER_HIERARCHY[i];
    if (nextTier !== 'expired') {
      return nextTier;
    }
  }
  return null;
}

/**
 * Check if usage is at or near limit
 */
export function checkUsageStatus(tier, limitKey, currentUsage) {
  const limit = USAGE_LIMITS[tier]?.[limitKey];
  
  if (limit === null) {
    return { status: 'unlimited', remaining: Infinity, percentUsed: 0 };
  }
  
  if (limit === 0) {
    return { status: 'locked', remaining: 0, percentUsed: 100 };
  }
  
  const remaining = Math.max(0, limit - currentUsage);
  const percentUsed = Math.min((currentUsage / limit) * 100, 100);
  
  if (currentUsage >= limit) {
    return { status: 'exceeded', remaining: 0, percentUsed: 100 };
  }
  
  if (percentUsed >= 90) {
    return { status: 'critical', remaining, percentUsed };
  }
  
  if (percentUsed >= 75) {
    return { status: 'warning', remaining, percentUsed };
  }
  
  return { status: 'ok', remaining, percentUsed };
}

/**
 * Feature category display names and icons
 */
export const CATEGORY_META = {
  import: {
    label: 'Data Import',
    icon: 'upload',
    description: 'Import swimmer and meet data'
  },
  roster: {
    label: 'Roster Management',
    icon: 'users',
    description: 'Manage your team roster'
  },
  meets: {
    label: 'Meets & Calendar',
    icon: 'calendar',
    description: 'Schedule and track meets'
  },
  practice: {
    label: 'Practice Tools',
    icon: 'clipboard-list',
    description: 'Plan and run practices'
  },
  analytics: {
    label: 'Analytics & Reports',
    icon: 'bar-chart-2',
    description: 'Track performance and generate reports'
  },
  team: {
    label: 'Team Features',
    icon: 'trophy',
    description: 'Records, achievements, and more'
  },
  ai: {
    label: 'AI Features',
    icon: 'sparkles',
    description: 'AI-powered analysis and assistance'
  },
  communication: {
    label: 'Communication',
    icon: 'message-circle',
    description: 'Parent portal and notifications'
  },
  customization: {
    label: 'Customization',
    icon: 'palette',
    description: 'Branding and personalization'
  }
};

