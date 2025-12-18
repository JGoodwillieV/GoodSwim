// src/ParentMessages.jsx
// Messages view for parents - shows Daily Brief (Updates) with settings access
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import DailyBrief from './DailyBrief';
import NotificationSettings from './NotificationSettings';
import { Settings, ArrowLeft, MessageSquare } from 'lucide-react';

export default function ParentMessages({ user, swimmerGroups }) {
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = new Set((reads || []).map(r => r.announcement_id));
      const unread = (announcements || []).filter(a => !readIds.has(a.id));
      setUnreadCount(unread.length);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  if (showSettings) {
    return (
      <div className="h-full overflow-y-auto pb-24 md:pb-8">
        <div className="p-4 md:p-8">
          <button
            onClick={() => setShowSettings(false)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Messages</span>
          </button>
        </div>
        <NotificationSettings />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Messages</h2>
            <p className="text-slate-500 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
            </p>
          </div>
        </div>
        
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
        >
          <Settings size={18} />
          <span className="hidden sm:inline font-medium">Settings</span>
        </button>
      </div>

      {/* Daily Brief / Updates */}
      <DailyBrief 
        userId={user.id} 
        swimmerGroups={swimmerGroups}
      />
    </div>
  );
}

