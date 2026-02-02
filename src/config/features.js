// src/config/features.js
// Central configuration for all GoodSwim features
// This is the single source of truth for feature/tier mappings

export const TIERS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  PRO: 'pro',
  CLUB: 'club',
  EXPIRED: 'expired'
};

// Tier hierarchy for comparison (higher index = higher tier)
export const TIER_HIERARCHY = ['expired', 'trial', 'starter', 'pro', 'club'];

/**
 * Master feature configuration
 * Each feature maps to its minimum required tier and metadata for UI
 * 
 * NOTE: Feature keys must match the column names in the feature_limits table
 */
export const FEATURES = {
  // =========== DATA IMPORT FEATURES ===========
  sd3_import: {
    key: 'sd3_import',
    label: 'SD3 File Import',
    description: 'Import roster and meet entries from SD3 files',
    requiredTier: TIERS.PRO,
    icon: 'file-up',
    category: 'import'
  },
  csv_import: {
    key: 'csv_import',
    label: 'CSV Import',
    description: 'Import data from CSV spreadsheets',
    requiredTier: TIERS.PRO,
    icon: 'table',
    category: 'import'
  },

  // =========== ROSTER FEATURES ===========
  unlimited_swimmers: {
    key: 'unlimited_swimmers',
    label: 'Unlimited Swimmers',
    description: 'No limit on roster size',
    requiredTier: TIERS.STARTER,
    icon: 'users',
    category: 'roster'
  },
  manual_entry: {
    key: 'manual_entry',
    label: 'Manual Data Entry',
    description: 'Add swimmers and results manually',
    requiredTier: TIERS.TRIAL, // Available to all
    icon: 'edit',
    category: 'roster'
  },

  // =========== MEET FEATURES ===========
  basic_calendar: {
    key: 'basic_calendar',
    label: 'Calendar & Scheduling',
    description: 'View and manage team calendar',
    requiredTier: TIERS.TRIAL, // Available to all
    icon: 'calendar',
    category: 'meets'
  },
  meet_reports: {
    key: 'meet_reports',
    label: 'Meet Reports',
    description: 'Generate detailed meet reports with stats & charts',
    requiredTier: TIERS.PRO,
    icon: 'file-text',
    category: 'meets'
  },

  // =========== PRACTICE FEATURES ===========
  practice_builder: {
    key: 'practice_builder',
    label: 'Practice Builder',
    description: 'Create structured practice plans with sets and intervals',
    requiredTier: TIERS.PRO,
    icon: 'clipboard-list',
    category: 'practice'
  },

  // =========== ANALYTICS/REPORTS FEATURES ===========
  advanced_analytics: {
    key: 'advanced_analytics',
    label: 'Advanced Analytics',
    description: 'Deep dive into performance metrics and trends',
    requiredTier: TIERS.CLUB,
    icon: 'trending-up',
    category: 'analytics'
  },

  // =========== TEAM FEATURES ===========
  team_records: {
    key: 'team_records',
    label: 'Team Records Board',
    description: 'Track and display team records',
    requiredTier: TIERS.PRO,
    icon: 'trophy',
    category: 'team'
  },
  trophy_case: {
    key: 'trophy_case',
    label: 'Trophy Case',
    description: 'Showcase swimmer achievements',
    requiredTier: TIERS.PRO,
    icon: 'medal',
    category: 'team'
  },

  // =========== AI FEATURES ===========
  ai_video_analysis: {
    key: 'ai_video_analysis',
    label: 'AI Video Analysis',
    description: 'AI-powered stroke analysis from video',
    requiredTier: TIERS.CLUB,
    icon: 'video',
    category: 'ai'
  },
  ai_chat: {
    key: 'ai_chat',
    label: 'AI Coaching Assistant',
    description: 'Chat with AI for coaching insights',
    requiredTier: TIERS.CLUB,
    icon: 'message-circle',
    category: 'ai'
  },

  // =========== PARENT PORTAL ===========
  parent_portal: {
    key: 'parent_portal',
    label: 'Parent Portal',
    description: 'Give parents view access to swimmer data',
    requiredTier: TIERS.TRIAL, // Available to all
    icon: 'users',
    category: 'communication'
  },
  push_notifications: {
    key: 'push_notifications',
    label: 'Push Notifications',
    description: 'Send push notifications to parents',
    requiredTier: TIERS.PRO,
    icon: 'bell',
    category: 'communication'
  },

  // =========== CUSTOMIZATION ===========
  custom_branding: {
    key: 'custom_branding',
    label: 'Custom Branding',
    description: 'Add your team logo and colors',
    requiredTier: TIERS.CLUB,
    icon: 'palette',
    category: 'customization'
  }
};

/**
 * Usage limits by tier
 * null = unlimited
 */
export const USAGE_LIMITS = {
  trial: {
    max_swimmers: 25,
    max_coaches: 1,
    ai_video_monthly: 0
  },
  starter: {
    max_swimmers: null, // Unlimited
    max_coaches: 1,
    ai_video_monthly: 0
  },
  pro: {
    max_swimmers: null,
    max_coaches: 3,
    ai_video_monthly: 0
  },
  club: {
    max_swimmers: null,
    max_coaches: null, // Unlimited
    ai_video_monthly: 10
  }
};

/**
 * Check if a tier has access to a feature
 * Uses the tier hierarchy for comparison
 */
export function tierHasFeature(userTier, featureKey) {
  if (userTier === TIERS.EXPIRED) return false;
  
  const feature = FEATURES[featureKey];
  if (!feature) return false;
  
  const userTierIndex = TIER_HIERARCHY.indexOf(userTier);
  const requiredTierIndex = TIER_HIERARCHY.indexOf(feature.requiredTier);
  
  return userTierIndex >= requiredTierIndex;
}

/**
 * Get the required tier for a feature
 */
export function getRequiredTier(featureKey) {
  const feature = FEATURES[featureKey];
  return feature?.requiredTier || TIERS.TRIAL;
}

/**
 * Get display name for a tier
 */
export function getTierDisplayName(tier) {
  const names = {
    trial: 'Free Trial',
    starter: 'Starter',
    pro: 'Pro',
    club: 'Club',
    expired: 'Expired'
  };
  return names[tier] || tier;
}

/**
 * Get the usage limit for a specific limit key and tier
 */
export function getUsageLimit(tier, limitKey) {
  const tierLimits = USAGE_LIMITS[tier];
  if (!tierLimits) return null;
  return tierLimits[limitKey] ?? null;
}

