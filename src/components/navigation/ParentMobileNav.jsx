// src/components/navigation/ParentMobileNav.jsx
// Parent mobile bottom navigation component
// 4 clear navigation items matching sidebar

import React, { useState, useEffect } from 'react';
import Icon from '../Icon';
import { supabase } from '../../supabase';

// Matching parent sidebar structure
const parentMobileNavItems = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Home' },
  { id: 'meets', icon: 'calendar', label: 'Schedule' },
  { id: 'my-swimmers', icon: 'user', label: 'Swimmers' },
  { id: 'notifications', icon: 'bell', label: 'Messages' },
];

export default function ParentMobileNav({ activeTab, setActiveTab }) {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[ParentMobileNav] No user found');
          return;
        }
        
        console.log('[ParentMobileNav] Fetching unread count for user:', user.id);
        
        // Get all non-expired announcements (RLS will filter to relevant ones)
        const { data: announceData, error: announceError } = await supabase
          .from('announcements')
          .select('id')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        if (announceError) {
          console.error('[ParentMobileNav] Error fetching announcements:', announceError);
          throw announceError;
        }

        console.log('[ParentMobileNav] Announcements found:', announceData?.length || 0);

        // Get read status for this user
        const { data: readData, error: readError } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        if (readError) {
          console.error('[ParentMobileNav] Error fetching read status:', readError);
          throw readError;
        }

        console.log('[ParentMobileNav] Read announcements:', readData?.length || 0);

        // Calculate unread count
        const readIds = new Set((readData || []).map(r => r.announcement_id));
        const unread = (announceData || []).filter(a => !readIds.has(a.id)).length;
        console.log('[ParentMobileNav] Unread count:', unread);
        setUnreadCount(unread);
      } catch (err) {
        console.error('[ParentMobileNav] Error fetching unread count:', err);
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
          
          console.log('[ParentMobileNav] Tab changed to:', activeTab, '- refreshing count');
          
          const { data: announceData, error: announceError } = await supabase
            .from('announcements')
            .select('id')
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

          if (announceError) {
            console.error('[ParentMobileNav] Error in tab change fetch:', announceError);
          }

          const { data: readData, error: readError } = await supabase
            .from('announcement_reads')
            .select('announcement_id')
            .eq('user_id', user.id);

          if (readError) {
            console.error('[ParentMobileNav] Error fetching reads in tab change:', readError);
          }

          const readIds = new Set((readData || []).map(r => r.announcement_id));
          const unread = (announceData || []).filter(a => !readIds.has(a.id)).length;
          console.log('[ParentMobileNav] Tab change - new unread count:', unread);
          setUnreadCount(unread);
        } catch (err) {
          console.error('[ParentMobileNav] Error fetching unread count on tab change:', err);
        }
      };
      
      fetchUnread();
    }
  }, [activeTab]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 flex justify-around items-end px-2 pt-2 pb-6 z-50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
      {parentMobileNavItems.map(item => {
        const isActive = activeTab === item.id;
        
        return (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-0.5 min-w-[60px] relative transition-all ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full" />
            )}
            
            <div className={`relative p-2 rounded-2xl transition-all ${
              isActive ? 'bg-blue-50 scale-110' : 'hover:bg-slate-100'
            }`}>
              <Icon name={item.icon} size={22} />
              
              {/* Badge for Messages/Notifications */}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
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
  );
}
