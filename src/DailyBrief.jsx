// src/DailyBrief.jsx
// The "Daily Brief" announcement feed - replaces chaotic email updates
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  Megaphone, AlertTriangle, Calendar, Users, PartyPopper, Settings,
  Info, ChevronRight, Clock, Check, CheckCheck, Filter, Bell,
  Pin, X, RefreshCw, Link2, FileText
} from 'lucide-react';

// Helper function to convert URLs in text to clickable links
function Linkify({ children, className = '' }) {
  if (!children || typeof children !== 'string') return children;
  
  // URL regex pattern - matches http://, https://, and www. URLs
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  
  const parts = children.split(urlPattern);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.match(urlPattern)) {
          // Add https:// to www. links if needed
          const href = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // Prevent card click when clicking link
              className={`text-blue-600 hover:text-blue-800 underline break-all ${className}`}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

// Type configuration with icons and colors
const ANNOUNCEMENT_TYPES = {
  alert: {
    icon: AlertTriangle,
    label: 'Alert',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700'
  },
  practice: {
    icon: RefreshCw,
    label: 'Practice',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700'
  },
  meet: {
    icon: Calendar,
    label: 'Meet',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700'
  },
  social: {
    icon: PartyPopper,
    label: 'Social',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700'
  },
  admin: {
    icon: Settings,
    label: 'Admin',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700'
  },
  info: {
    icon: Info,
    label: 'Info',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-700'
  }
};

// Single Announcement Card
function AnnouncementCard({ announcement, onMarkRead }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = ANNOUNCEMENT_TYPES[announcement.type] || ANNOUNCEMENT_TYPES.info;
  const Icon = config.icon;
  
  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Clean up author name - if it's an email, extract and format the name part
  const getDisplayName = (authorName) => {
    if (!authorName) return 'Team';
    
    // If it contains @ symbol, it's an email - extract the name part
    if (authorName.includes('@')) {
      const namePart = authorName.split('@')[0];
      // Replace dots, underscores, dashes with spaces and capitalize
      return namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return authorName;
  };

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (!announcement.is_read && onMarkRead) {
      onMarkRead(announcement.id);
    }
  };

  // Render attachments (links and files)
  const renderAttachments = (isUrgent = false) => {
    const hasLink = announcement.link_url;
    const hasFile = announcement.attachment_url;
    
    if (!hasLink && !hasFile) return null;
    
    const linkClasses = isUrgent 
      ? "flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors" 
      : "flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors";
    
    const iconClasses = isUrgent ? "text-white" : "text-blue-600";
    const textClasses = isUrgent ? "text-white text-sm font-medium" : "text-slate-700 text-sm font-medium";
    
    return (
      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
        {hasLink && (
          <a 
            href={announcement.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            <Link2 size={16} className={iconClasses} />
            <span className={textClasses}>
              {announcement.link_title || 'View Link'}
            </span>
          </a>
        )}
        {hasFile && (
          <a 
            href={announcement.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            <FileText size={16} className={iconClasses} />
            <span className={textClasses}>
              {announcement.attachment_filename || 'Download File'}
            </span>
          </a>
        )}
      </div>
    );
  };

  // Urgent announcements get special treatment
  if (announcement.is_urgent) {
    return (
      <div 
        onClick={handleClick}
        className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg shadow-red-200 cursor-pointer hover:shadow-xl transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                URGENT
              </span>
              <span className="text-xs text-red-100">{timeAgo(announcement.created_at)}</span>
            </div>
            {announcement.title && (
              <h3 className="font-bold text-lg mb-1">{announcement.title}</h3>
            )}
            <p className={`text-red-50 ${isExpanded ? '' : 'line-clamp-2'}`}>
              <Linkify className="text-white hover:text-red-100">{announcement.content}</Linkify>
            </p>
            {announcement.content.length > 100 && (
              <button className="text-xs text-white/70 mt-2 hover:text-white">
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
            {renderAttachments(true)}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
          <span className="text-xs text-red-100">From: {getDisplayName(announcement.author_name)}</span>
          {announcement.is_read ? (
            <CheckCheck size={16} className="text-white/50" />
          ) : (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  // Pinned announcements
  if (announcement.is_pinned) {
    return (
      <div 
        onClick={handleClick}
        className={`${config.bg} ${config.border} border-2 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all relative overflow-hidden`}
      >
        <div className="absolute top-2 right-2">
          <Pin size={14} className={config.color} />
        </div>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0`}>
            <Icon size={20} className={config.color} />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                {config.label}
              </span>
              <span className="text-xs text-slate-400">Pinned</span>
            </div>
            {announcement.title && (
              <h3 className="font-bold text-slate-800 mb-1">{announcement.title}</h3>
            )}
            <p className={`text-slate-600 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
              <Linkify>{announcement.content}</Linkify>
            </p>
            {renderAttachments(false)}
          </div>
        </div>
      </div>
    );
  }

  // Regular announcement
  return (
    <div 
      onClick={handleClick}
      className={`bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all ${
        !announcement.is_read ? 'ring-2 ring-blue-100 ring-offset-1' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={18} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                {config.label}
              </span>
              {!announcement.is_read && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            <span className="text-xs text-slate-400">{timeAgo(announcement.created_at)}</span>
          </div>
          {announcement.title && (
            <h3 className="font-semibold text-slate-800 mb-1">{announcement.title}</h3>
          )}
          <p className={`text-slate-600 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
            <Linkify>{announcement.content}</Linkify>
          </p>
          {announcement.content.length > 120 && !isExpanded && (
            <button className="text-xs text-blue-600 mt-1 hover:text-blue-700 font-medium">
              Read more
            </button>
          )}
          {renderAttachments(false)}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {getDisplayName(announcement.author_name)}
        </span>
        {announcement.is_read && (
          <CheckCheck size={14} className="text-slate-300" />
        )}
      </div>
    </div>
  );
}

// Filter Chip Component
function FilterChip({ label, icon: Icon, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        active 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {Icon && <Icon size={14} />}
      {label}
      {count > 0 && (
        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-slate-200'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Main Daily Brief Component
export default function DailyBrief({ userId, swimmerGroups = [], compact = false }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', or a type
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, [userId]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      
      // Fetch announcements with read status
      // Using a simple query - the RLS policies handle targeting
      const { data: announceData, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          type,
          is_pinned,
          is_urgent,
          author_name,
          created_at,
          expires_at,
          target_groups,
          link_url,
          link_title,
          attachment_url,
          attachment_filename,
          attachment_type
        `)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('is_pinned', { ascending: false })
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get read status for this user
      const { data: readData } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId);

      const readIds = new Set((readData || []).map(r => r.announcement_id));

      // Merge read status
      const enrichedAnnouncements = (announceData || []).map(a => ({
        ...a,
        is_read: readIds.has(a.id)
      }));

      setAnnouncements(enrichedAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId) => {
    try {
      await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: userId
        }, {
          onConflict: 'announcement_id,user_id'
        });

      // Update local state
      setAnnouncements(prev => 
        prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !a.is_read;
    return a.type === filter;
  });

  // Count unread
  const unreadCount = announcements.filter(a => !a.is_read).length;

  // Separate urgent/pinned for special rendering
  const urgentAnnouncements = filteredAnnouncements.filter(a => a.is_urgent);
  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.is_pinned && !a.is_urgent);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.is_urgent && !a.is_pinned);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Compact mode for dashboard widget
  if (compact) {
    const recentAnnouncements = [...urgentAnnouncements, ...pinnedAnnouncements, ...regularAnnouncements].slice(0, 3);
    
    return (
      <div className="space-y-3">
        {/* Header with unread badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-blue-500" />
            <h3 className="font-bold text-slate-800">Team Updates</h3>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        {/* Announcements */}
        {recentAnnouncements.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <Bell size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAnnouncements.map(announcement => (
              <AnnouncementCard 
                key={announcement.id} 
                announcement={announcement}
                onMarkRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Daily Brief</h2>
            <p className="text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up!'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-xl transition-colors ${
            showFilters ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <FilterChip 
            label="All" 
            active={filter === 'all'} 
            onClick={() => setFilter('all')}
            count={announcements.length}
          />
          <FilterChip 
            label="Unread" 
            icon={Bell}
            active={filter === 'unread'} 
            onClick={() => setFilter('unread')}
            count={unreadCount}
          />
          {Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => {
            const count = announcements.filter(a => a.type === key).length;
            if (count === 0) return null;
            return (
              <FilterChip 
                key={key}
                label={config.label}
                icon={config.icon}
                active={filter === key}
                onClick={() => setFilter(key)}
                count={count}
              />
            );
          })}
        </div>
      )}

      {/* Urgent Announcements */}
      {urgentAnnouncements.length > 0 && (
        <div className="space-y-3">
          {urgentAnnouncements.map(announcement => (
            <AnnouncementCard 
              key={announcement.id} 
              announcement={announcement}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      )}

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          {pinnedAnnouncements.map(announcement => (
            <AnnouncementCard 
              key={announcement.id} 
              announcement={announcement}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      {regularAnnouncements.length > 0 && (
        <div className="space-y-3">
          {regularAnnouncements.map(announcement => (
            <AnnouncementCard 
              key={announcement.id} 
              announcement={announcement}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAnnouncements.length === 0 && (
        <div className="bg-slate-50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={32} className="text-slate-300" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">
            {filter === 'unread' ? 'All caught up!' : 'No announcements'}
          </h3>
          <p className="text-slate-500 text-sm">
            {filter === 'unread' 
              ? "You've read all the updates. Nice!" 
              : "Check back later for team updates."}
          </p>
        </div>
      )}
    </div>
  );
}
