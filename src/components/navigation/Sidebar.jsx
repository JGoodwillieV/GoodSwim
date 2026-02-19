// src/components/navigation/Sidebar.jsx
// Coach sidebar navigation component
// Restructured to 6 logical navigation items (4.1)

import React from 'react';
import Icon from '../Icon';
import { ChevronRight, Lock, Crown } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { FEATURES, tierHasFeature, getTierDisplayName } from '../../config/features';

// New consolidated navigation: 6 logical groupings
// Some nav items contain pro/club features - we'll show a subtle indicator
const navItems = [
  { 
    id: 'dashboard', 
    icon: 'layout-dashboard', 
    label: 'Dashboard',
    description: 'Overview & quick actions',
    requiredFeature: null // Always available
  },
  { 
    id: 'schedule', 
    icon: 'calendar', 
    label: 'Schedule',
    description: 'Meets, practices & events',
    requiredFeature: null, // Base access always available
    hasProFeatures: ['practice_builder'] // Contains pro features
  },
  { 
    id: 'team', 
    icon: 'users', 
    label: 'Team',
    description: 'Roster, groups & records',
    requiredFeature: null,
    hasProFeatures: ['team_records', 'trophy_case']
  },
  { 
    id: 'communications', 
    icon: 'megaphone', 
    label: 'Communications',
    description: 'Announcements & invites',
    requiredFeature: null,
    hasProFeatures: ['push_notifications']
  },
  { 
    id: 'reports', 
    icon: 'bar-chart-2', 
    label: 'Reports',
    description: 'Analytics & progress',
    requiredFeature: null,
    hasProFeatures: ['meet_reports', 'advanced_analytics']
  },
  { 
    id: 'tools', 
    icon: 'sparkles', 
    label: 'Tools',
    description: 'AI chat & more',
    requiredFeature: null,
    hasProFeatures: ['ai_video_analysis', 'ai_chat']
  },
  { 
    id: 'billing', 
    icon: 'credit-card', 
    label: 'Billing',
    description: 'Subscription & payments',
    requiredFeature: null
  },
];

export default function Sidebar({ activeTab, setActiveTab, onLogout, session }) {
  // Get team name from user metadata or default to "GoodSwim"
  const teamName = session?.user?.user_metadata?.team_name || "GoodSwim";
  const { tier, hasFeature, isTrial, isPaid } = useSubscription();

  const handleNavClick = (id) => {
    setActiveTab(id);
  };

  // Check if the current tab is within a hub's scope
  const isTabActive = (itemId) => {
    if (activeTab === itemId) return true;
    
    // Map child views to their parent hubs
    const hubMappings = {
      team: ['roster', 'profile', 'trophy-case'],
      communications: ['announcements'],
      reports: ['test-sets-list'],
      tools: ['analysis', 'ai-chat', 'view-analysis'],
      schedule: ['calendar', 'meets', 'meet-entries', 'practice-hub', 'practice-builder', 'test-set'],
      help: [],
    };
    
    return hubMappings[itemId]?.includes(activeTab) || false;
  };

  // Check if nav item has any locked pro features
  const hasLockedProFeatures = (item) => {
    if (!item.hasProFeatures || isPaid) return false;
    return item.hasProFeatures.some(f => !hasFeature(f));
  };

  // Get the highest tier needed for a nav item's pro features
  const getHighestRequiredTier = (item) => {
    if (!item.hasProFeatures) return null;
    let highest = null;
    for (const featureKey of item.hasProFeatures) {
      const feature = FEATURES[featureKey];
      if (feature && !tierHasFeature(tier, featureKey)) {
        if (!highest || ['starter', 'pro', 'club'].indexOf(feature.requiredTier) > ['starter', 'pro', 'club'].indexOf(highest)) {
          highest = feature.requiredTier;
        }
      }
    }
    return highest;
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 flex-col p-5 fixed h-full z-10 hidden md:flex">
      {/* Logo & Brand */}
      <div className="flex flex-col items-center gap-3 mb-6 px-2">
        <div className="relative">
          <img 
            src="/GoodSwimLogo.png" 
            alt="GoodSwim" 
            className="h-16 w-auto object-contain" 
          />
        </div>
        <h1 className="text-white font-bold text-lg text-center tracking-tight">{teamName}</h1>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map(item => {
          const isActive = isTabActive(item.id);
          const hasLockedFeatures = hasLockedProFeatures(item);
          const requiredTier = getHighestRequiredTier(item);
          
          return (
            <button 
              key={item.id} 
              onClick={() => handleNavClick(item.id)} 
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all group relative ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${
                isActive ? 'bg-blue-500' : 'bg-slate-800 group-hover:bg-slate-700'
              }`}>
                <Icon name={item.icon} size={18} />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium block text-sm">{item.label}</span>
              </div>
              
              {/* Pro/Club feature indicator */}
              {hasLockedFeatures && requiredTier && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  requiredTier === 'club' 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {requiredTier === 'club' ? 'CLUB' : 'PRO'}
                </span>
              )}
              
              <ChevronRight size={16} className={`transition-all ${
                isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
              }`} />
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="border-t border-slate-800 my-4" />

      {/* Bottom Section */}
      <div className="space-y-1.5">
        <button 
          onClick={() => handleNavClick('help')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
            isTabActive('help')
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${
            isTabActive('help') ? 'bg-blue-500' : 'bg-slate-800 group-hover:bg-slate-700'
          }`}>
            <Icon name="help-circle" size={16} />
          </div>
          <span className="font-medium text-sm">Help</span>
        </button>
        <button 
          onClick={onLogout} 
          className="w-full text-slate-500 hover:text-white text-sm flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-all"
        >
          <Icon name="log-out" size={16} /> 
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
