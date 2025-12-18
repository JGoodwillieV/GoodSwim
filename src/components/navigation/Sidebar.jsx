// src/components/navigation/Sidebar.jsx
// Coach sidebar navigation component
// Restructured to 6 logical navigation items (4.1)

import React from 'react';
import Icon from '../Icon';
import { ChevronRight } from 'lucide-react';

// New consolidated navigation: 6 logical groupings
const navItems = [
  { 
    id: 'dashboard', 
    icon: 'layout-dashboard', 
    label: 'Dashboard',
    description: 'Overview & quick actions'
  },
  { 
    id: 'schedule', 
    icon: 'calendar', 
    label: 'Schedule',
    description: 'Meets, practices & events'
  },
  { 
    id: 'team', 
    icon: 'users', 
    label: 'Team',
    description: 'Roster, groups & records'
  },
  { 
    id: 'communications', 
    icon: 'megaphone', 
    label: 'Communications',
    description: 'Announcements & invites'
  },
  { 
    id: 'reports', 
    icon: 'bar-chart-2', 
    label: 'Reports',
    description: 'Analytics & progress'
  },
  { 
    id: 'tools', 
    icon: 'sparkles', 
    label: 'Tools',
    description: 'AI analysis & chat'
  },
];

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {

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
    };
    
    return hubMappings[itemId]?.includes(activeTab) || false;
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 flex-col p-5 fixed h-full z-10 hidden md:flex">
      {/* Logo & Brand */}
      <div className="flex flex-col items-center gap-3 mb-6 px-2">
        <div className="relative">
          <img 
            src="/team-logo-white.png" 
            alt="StormTracker" 
            className="h-16 w-auto object-contain" 
          />
        </div>
        <h1 className="text-white font-bold text-lg text-center tracking-tight">StormTracker</h1>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map(item => {
          const isActive = isTabActive(item.id);
          
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
              
              <ChevronRight size={16} className={`transition-all ${
                isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
              }`} />
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="border-t border-slate-800 my-4" />

      {/* User Section */}
      <div className="space-y-2">
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
