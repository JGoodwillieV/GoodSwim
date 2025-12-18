// src/components/navigation/MobileNav.jsx
// Coach mobile bottom navigation component
// Restructured to match new 6-item nav (5 visible + overflow)

import React, { useState } from 'react';
import Icon from '../Icon';
import { MoreHorizontal, X } from 'lucide-react';

// Mobile nav - 5 primary items plus "More" menu for Tools
const mobileNavItems = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Home' },
  { id: 'schedule', icon: 'calendar', label: 'Schedule' },
  { id: 'team', icon: 'users', label: 'Team' },
  { id: 'communications', icon: 'megaphone', label: 'Comms' },
  { id: 'more', icon: 'more-horizontal', label: 'More', isMenu: true },
];

// Items in the "More" menu
const moreMenuItems = [
  { id: 'reports', icon: 'bar-chart-2', label: 'Reports', description: 'Analytics & progress' },
  { id: 'tools', icon: 'sparkles', label: 'Tools', description: 'AI analysis & chat' },
];

export default function MobileNav({ activeTab, setActiveTab }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // Check if "More" should be highlighted
  const isMoreActive = moreMenuItems.some(item => isTabActive(item.id));

  const handleNavClick = (item) => {
    if (item.isMenu) {
      setShowMoreMenu(!showMoreMenu);
    } else {
      setActiveTab(item.id);
      setShowMoreMenu(false);
    }
  };

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">More Options</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-2">
              {moreMenuItems.map(item => {
                const isActive = isTabActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Icon name={item.icon} size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 flex justify-around items-end px-2 pt-2 pb-6 z-50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
        {mobileNavItems.map((item) => {
          const isActive = item.isMenu ? isMoreActive : isTabActive(item.id);
          
          return (
            <button 
              key={item.id} 
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] relative transition-all ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              {/* Active indicator */}
              {isActive && !item.isMenu && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full" />
              )}
              
              <div className={`relative p-2 rounded-2xl transition-all ${
                isActive ? 'bg-blue-50 scale-110' : 'hover:bg-slate-100'
              }`}>
                {item.isMenu ? (
                  <MoreHorizontal size={22} />
                ) : (
                  <Icon name={item.icon} size={22} />
                )}
                
                {/* Dot indicator for More when something inside is active */}
                {item.isMenu && isMoreActive && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full" />
                )}
              </div>
              
              <span className={`text-[10px] font-semibold transition-all ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* CSS for mobile slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
