// src/components/navigation/ParentSidebar.jsx
// Parent sidebar navigation component
// Restructured to 4 clear navigation items (4.1)

import React, { useState, useEffect } from 'react';
import Icon from '../Icon';
import { supabase } from '../../supabase';
import { ChevronRight } from 'lucide-react';

// Proposed Parent Navigation (4 items):
// 1. Home - Dashboard with Action Center prominent
// 2. Schedule - Calendar + upcoming meets
// 3. My Swimmers - Profiles + progress
// 4. Messages - Daily Brief + Notifications

const parentNavItems = [
  { 
    id: 'dashboard', 
    icon: 'layout-dashboard', 
    label: 'Home',
    description: 'Action Center & updates'
  },
  { 
    id: 'meets', 
    icon: 'calendar', 
    label: 'Schedule',
    description: 'Calendar & swim meets'
  },
  { 
    id: 'my-swimmers', 
    icon: 'user', 
    label: 'My Swimmers',
    description: 'Profiles & progress'
  },
  { 
    id: 'notifications', 
    icon: 'bell', 
    label: 'Messages',
    description: 'Daily brief & alerts'
  },
];

export default function ParentSidebar({ activeTab, setActiveTab, onLogout }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[ParentSidebar] No user found');
          return;
        }

        console.log('[ParentSidebar] Fetching unread count for user:', user.id);

        // Get all non-expired announcements
        const { data: announceData, error: announceError } = await supabase
          .from('announcements')
          .select('id')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        if (announceError) {
          console.error('[ParentSidebar] Error fetching announcements:', announceError);
          throw announceError;
        }

        console.log('[ParentSidebar] Announcements found:', announceData?.length || 0);

        // Get read status for this user
        const { data: readData, error: readError } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        if (readError) {
          console.error('[ParentSidebar] Error fetching read status:', readError);
          throw readError;
        }

        console.log('[ParentSidebar] Read announcements:', readData?.length || 0);

        // Calculate unread count
        const readIds = new Set((readData || []).map(r => r.announcement_id));
        const unread = (announceData || []).filter(a => !readIds.has(a.id)).length;
        console.log('[ParentSidebar] Unread count:', unread);
        setUnreadCount(unread);
      } catch (err) {
        console.error('[ParentSidebar] Error fetching unread count:', err);
      }
    };

    fetchUnread();
    
    // Poll for updates every 10 seconds (more responsive)
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  // Refresh count when navigating away from notifications tab
  // This ensures the badge updates after reading messages
  useEffect(() => {
    if (activeTab !== 'notifications') {
      const fetchUnread = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          console.log('[ParentSidebar] Tab changed to:', activeTab, '- refreshing count');

          const { data: announceData, error: announceError } = await supabase
            .from('announcements')
            .select('id')
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

          if (announceError) {
            console.error('[ParentSidebar] Error in tab change fetch:', announceError);
          }

          const { data: readData, error: readError } = await supabase
            .from('announcement_reads')
            .select('announcement_id')
            .eq('user_id', user.id);

          if (readError) {
            console.error('[ParentSidebar] Error fetching reads in tab change:', readError);
          }

          const readIds = new Set((readData || []).map(r => r.announcement_id));
          const unread = (announceData || []).filter(a => !readIds.has(a.id)).length;
          console.log('[ParentSidebar] Tab change - new unread count:', unread);
          setUnreadCount(unread);
        } catch (err) {
          console.error('[ParentSidebar] Error fetching unread count on tab change:', err);
        }
      };
      
      fetchUnread();
    }
  }, [activeTab]);

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
        <div className="text-center">
          <h1 className="text-white font-bold text-lg tracking-tight">StormTracker</h1>
          <span className="text-xs text-slate-500">Parent Portal</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="space-y-1.5 flex-1">
        {parentNavItems.map(item => {
          const isActive = activeTab === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all group ${
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
                {(isActive || isHovered) && (
                  <span className={`text-xs ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                    {item.description}
                  </span>
                )}
              </div>
              
              {/* Badge for Messages/Notifications */}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
              
              <ChevronRight size={16} className={`transition-all ${
                isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
              }`} />
            </button>
          );
        })}
      </nav>
      
      {/* User Section */}
      <div className="border-t border-slate-800 pt-4 mt-4 space-y-2">
        <p className="text-slate-500 text-xs px-3 mb-2">Parent Account</p>
        <button 
          onClick={onLogout} 
          className="w-full text-slate-500 hover:text-white text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-all"
        >
          <Icon name="log-out" size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
