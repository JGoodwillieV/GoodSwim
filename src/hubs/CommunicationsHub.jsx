// src/hubs/CommunicationsHub.jsx
// Communications Hub - Consolidated view for Announcements and Parent Messages
// Navigation restructure: combines communication features into one section

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Megaphone, Mail, UserPlus, Send, Bell, ChevronRight, Clock,
  MessageSquare, Users, CheckCircle, AlertCircle, Loader2, Plus,
  Calendar, Eye, Edit2, Archive, Link2, Paperclip, ExternalLink
} from 'lucide-react';
import { formatDateSafe } from '../utils/dateUtils';

// Tab configuration
const TABS = [
  { id: 'announcements', label: 'Announcements', icon: Megaphone, description: 'Team-wide messages' },
  { id: 'invites', label: 'Parent Invites', icon: UserPlus, description: 'Manage parent access' },
];

// Announcement Card
function AnnouncementCard({ announcement, onEdit }) {
  const isRecent = new Date(announcement.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isRecent && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">New</span>
            )}
            <span className="text-xs text-slate-400">
              {formatDateSafe(announcement.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          {announcement.title && (
            <h3 className="font-semibold text-slate-800 mb-1">{announcement.title}</h3>
          )}
          <p className="text-sm text-slate-600 line-clamp-2">{announcement.content || announcement.message}</p>
          
          {/* Link */}
          {announcement.link_url && (
            <a
              href={announcement.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 size={14} className="text-blue-600" />
              <span className="text-sm text-blue-700 font-medium truncate flex-1">
                {announcement.link_title || 'View Link'}
              </span>
              <ExternalLink size={12} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
          
          {/* Attachment */}
          {announcement.attachment_url && (
            <a
              href={announcement.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors group"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip size={14} className="text-slate-600" />
              <span className="text-sm text-slate-700 font-medium truncate flex-1">
                {announcement.attachment_filename || 'Attachment'}
              </span>
              <ExternalLink size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
          
          {announcement.target_groups?.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Users size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">{announcement.target_groups.join(', ')}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => onEdit?.(announcement)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
}

// Invite Card
function InviteCard({ invite }) {
  const statusColors = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    accepted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    expired: { bg: 'bg-slate-100', text: 'text-slate-500', icon: AlertCircle },
  };
  
  const status = statusColors[invite.status] || statusColors.pending;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
          <Mail size={20} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-800 truncate">{invite.email}</h4>
          <p className="text-xs text-slate-500">
            For: {invite.swimmers?.name || 'Unknown swimmer'}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          <StatusIcon size={12} />
          {invite.status}
        </div>
      </div>
    </div>
  );
}

// Announcements Tab Content
function AnnouncementsTab({ onComposeNew, onEditAnnouncement, refreshKey, navigateTo }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [refreshKey]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compose Button */}
      <button
        onClick={onComposeNew}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 flex items-center justify-between hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-200/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Send size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold">Compose Announcement</h3>
            <p className="text-blue-100 text-sm">Send a message to parents</p>
          </div>
        </div>
        <ChevronRight size={20} />
      </button>

      {/* Announcements List */}
      {announcements.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Recent Announcements</h3>
          {announcements.map(announcement => (
            <AnnouncementCard 
              key={announcement.id} 
              announcement={announcement}
              onEdit={onEditAnnouncement}
            />
          ))}
          {/* View All Button */}
          <button
            onClick={() => navigateTo('announcements')}
            className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-slate-600 hover:text-slate-800"
          >
            <Archive size={18} />
            <span className="font-medium">View All Announcements</span>
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">No announcements yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first announcement to get started</p>
        </div>
      )}
    </div>
  );
}

// Invites Tab Content
function InvitesTab({ onInviteParent, swimmers }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('parent_invitations')
        .select('*, swimmers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    pending: invites.filter(i => i.status === 'pending').length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    total: invites.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-slate-500">Pending</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-xs text-slate-500">Accepted</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-600">{stats.total}</div>
          <div className="text-xs text-slate-500">Total Sent</div>
        </div>
      </div>

      {/* Invite Button */}
      <button
        onClick={onInviteParent}
        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl p-4 flex items-center justify-between hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-200/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold">Invite Parent</h3>
            <p className="text-violet-100 text-sm">Send portal access invite</p>
          </div>
        </div>
        <ChevronRight size={20} />
      </button>

      {/* Invites List */}
      {invites.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Sent Invitations</h3>
          {invites.map(invite => (
            <InviteCard key={invite.id} invite={invite} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Mail size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">No invitations sent</p>
          <p className="text-slate-500 text-sm mt-1">Invite parents to access the portal</p>
        </div>
      )}
    </div>
  );
}

// Main CommunicationsHub Component
export default function CommunicationsHub({ 
  swimmers = [],
  onComposeAnnouncement,
  onEditAnnouncement,
  onInviteParent,
  navigateTo,
  refreshKey = 0
}) {
  const [activeTab, setActiveTab] = useState('announcements');

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Communications</h1>
        <p className="text-slate-500">Manage announcements and parent communications</p>
      </div>

      {/* Quick Actions Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={onComposeAnnouncement}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4 hover:bg-blue-100 transition-all text-left"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Megaphone size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900">New Announcement</h3>
            <p className="text-sm text-blue-700">Send message to team</p>
          </div>
        </button>
        <button
          onClick={onInviteParent}
          className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-4 hover:bg-violet-100 transition-all text-left"
        >
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <UserPlus size={24} className="text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-violet-900">Invite Parent</h3>
            <p className="text-sm text-violet-700">Grant portal access</p>
          </div>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-50 rounded-2xl p-4 md:p-6">
        {activeTab === 'announcements' && (
          <AnnouncementsTab 
            onComposeNew={onComposeAnnouncement}
            onEditAnnouncement={onEditAnnouncement}
            refreshKey={refreshKey}
            navigateTo={navigateTo}
          />
        )}
        {activeTab === 'invites' && (
          <InvitesTab 
            swimmers={swimmers}
            onInviteParent={onInviteParent}
          />
        )}
      </div>
    </div>
  );
}

