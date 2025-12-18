// src/AnnouncementComposer.jsx
// Coach interface for creating announcements
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { notifyDailyBrief } from './utils/pushNotifications';
import {
  Send, X, AlertTriangle, RefreshCw, Calendar, PartyPopper,
  Settings, Info, Pin, Bell, ChevronDown, Check, Users,
  Megaphone, Clock, Eye, Loader2, ChevronLeft, Trash2,
  Edit3, MoreVertical, Link2, Paperclip, Upload, File
} from 'lucide-react';

// Type options with styling
const ANNOUNCEMENT_TYPES = [
  { value: 'practice', label: 'Practice Change', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
  { value: 'meet', label: 'Meet Info', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'social', label: 'Social Event', icon: PartyPopper, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'admin', label: 'Admin Notice', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-50' },
  { value: 'info', label: 'General Info', icon: Info, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { value: 'alert', label: 'Urgent Alert', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' }
];

// Character limit for tweet-style posts
const MAX_CHARS = 280;

// Group Selector Dropdown
function GroupSelector({ groups, selectedGroups, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleGroup = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      onChange(selectedGroups.filter(id => id !== groupId));
    } else {
      onChange([...selectedGroups, groupId]);
    }
  };

  const selectAll = () => onChange([]);
  const isAllSelected = selectedGroups.length === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-slate-400" />
          <span className="text-slate-700">
            {isAllSelected 
              ? 'All Groups (Team-wide)' 
              : `${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''} selected`
            }
          </span>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {/* All Groups Option */}
          <button
            type="button"
            onClick={selectAll}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
              isAllSelected ? 'bg-blue-50' : ''
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
              isAllSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
            }`}>
              {isAllSelected && <Check size={14} className="text-white" />}
            </div>
            <span className="font-medium text-slate-700">All Groups (Team-wide)</span>
          </button>

          {/* Individual Groups */}
          {groups.map(group => {
            const isSelected = selectedGroups.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color || '#3b82f6' }}
                />
                <span className="text-slate-700">{group.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Type Selector Grid
function TypeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {ANNOUNCEMENT_TYPES.map(type => {
        const Icon = type.icon;
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
              isSelected 
                ? `${type.bg} border-current ${type.color}` 
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Icon size={16} />
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Main Composer Component
export function AnnouncementComposer({ onClose, onSuccess, editingAnnouncement = null }) {
  const [content, setContent] = useState(editingAnnouncement?.content || '');
  const [title, setTitle] = useState(editingAnnouncement?.title || '');
  const [type, setType] = useState(editingAnnouncement?.type || 'info');
  const [targetGroups, setTargetGroups] = useState(editingAnnouncement?.target_groups || []);
  const [isPinned, setIsPinned] = useState(editingAnnouncement?.is_pinned || false);
  const [isUrgent, setIsUrgent] = useState(editingAnnouncement?.is_urgent || false);
  const [expiresAt, setExpiresAt] = useState(editingAnnouncement?.expires_at?.split('T')[0] || '');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Link and attachment states
  const [linkUrl, setLinkUrl] = useState(editingAnnouncement?.link_url || '');
  const [linkTitle, setLinkTitle] = useState(editingAnnouncement?.link_title || '');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(
    editingAnnouncement?.attachment_url 
      ? { url: editingAnnouncement.attachment_url, filename: editingAnnouncement.attachment_filename }
      : null
  );
  const [uploading, setUploading] = useState(false);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .order('display_order');
    if (data) setGroups(data);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = ['.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Please select a PDF, CSV, Excel, or Word document');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setAttachmentFile(file);
    setExistingAttachment(null); // Clear existing if new file selected
  };

  const uploadAttachment = async () => {
    if (!attachmentFile) return null;

    setUploading(true);
    try {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('announcement-attachments')
        .upload(filePath, attachmentFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('announcement-attachments')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        filename: attachmentFile.name,
        type: attachmentFile.type || fileExt
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      // Upload attachment if there's a new file
      let attachmentData = existingAttachment;
      if (attachmentFile) {
        attachmentData = await uploadAttachment();
      }

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user's display name from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      // Determine author name - never show full email
      let authorName = 'Coach';
      if (profile?.display_name && profile.display_name.trim()) {
        authorName = profile.display_name.trim();
      } else if (user.email) {
        // Extract name from email (part before @)
        authorName = user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      const announcementData = {
        content: content.trim(),
        title: title.trim() || null,
        type,
        target_groups: targetGroups.length > 0 ? targetGroups : null,
        is_pinned: isPinned,
        is_urgent: isUrgent,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        author_id: user.id,
        author_name: authorName,
        link_url: linkUrl.trim() || null,
        link_title: linkTitle.trim() || null,
        attachment_url: attachmentData?.url || null,
        attachment_filename: attachmentData?.filename || null,
        attachment_type: attachmentData?.type || null
      };

      let error, newAnnouncement;
      if (editingAnnouncement) {
        // Update existing
        ({ error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id));
      } else {
        // Create new
        const result = await supabase
          .from('announcements')
          .insert(announcementData)
          .select()
          .single();
        
        error = result.error;
        newAnnouncement = result.data;
      }

      if (error) throw error;

      // Send push notifications for new announcements (not edits)
      if (newAnnouncement && !editingAnnouncement) {
        try {
          // Get swimmer IDs for the targeted groups (or all swimmers if no groups specified)
          let swimmerIds = [];
          
          if (targetGroups.length > 0) {
            // Get swimmers in the specified groups
            const { data: swimmers } = await supabase
              .from('swimmers')
              .select('id')
              .in('group_id', targetGroups); // Fixed: group_id not team_group_id
            
            swimmerIds = swimmers?.map(s => s.id) || [];
            console.log(`[Push] Found ${swimmerIds.length} swimmers in targeted groups`);
          } else {
            // Get all swimmers
            const { data: swimmers } = await supabase
              .from('swimmers')
              .select('id');
            
            swimmerIds = swimmers?.map(s => s.id) || [];
            console.log(`[Push] Found ${swimmerIds.length} total swimmers`);
          }

          // Send notification to parents
          if (swimmerIds.length > 0) {
            console.log(`[Push] Sending notification for announcement: ${newAnnouncement.title || newAnnouncement.type}`);
            await notifyDailyBrief(newAnnouncement, swimmerIds);
          } else {
            console.log('[Push] No swimmers found to notify');
          }
        } catch (notifyError) {
          console.error('Error sending push notification:', notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Error saving announcement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const charsRemaining = MAX_CHARS - content.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-xl md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
            <h2 className="font-bold text-lg text-slate-800">
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || uploading || !content.trim() || isOverLimit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {(loading || uploading) ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {uploading ? 'Uploading...' : 'Posting...'}
              </>
            ) : (
              <>
                <Send size={18} />
                Post
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Optional Title */}
          <input
            type="text"
            placeholder="Headline (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            maxLength={100}
          />

          {/* Main Content */}
          <div className="relative">
            <textarea
              placeholder="What's happening? Keep it short and clear..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${
                isOverLimit ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              rows={4}
            />
            <div className={`absolute bottom-3 right-3 text-sm font-medium ${
              isOverLimit ? 'text-red-500' : charsRemaining < 50 ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {charsRemaining}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </label>
            <TypeSelector value={type} onChange={setType} />
          </div>

          {/* Group Targeting */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Who should see this?
            </label>
            <GroupSelector 
              groups={groups}
              selectedGroups={targetGroups}
              onChange={setTargetGroups}
            />
          </div>

          {/* Link Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Link2 size={16} />
              Add Link (optional)
            </label>
            <input
              type="text"
              placeholder="Link title"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* File Attachment Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Paperclip size={16} />
              Attach File (optional)
            </label>
            
            {existingAttachment && !attachmentFile ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <File size={18} className="text-blue-600" />
                <span className="text-sm text-blue-900 flex-1 truncate">{existingAttachment.filename}</span>
                <button
                  type="button"
                  onClick={() => setExistingAttachment(null)}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <X size={16} className="text-blue-600" />
                </button>
              </div>
            ) : attachmentFile ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <File size={18} className="text-green-600" />
                <span className="text-sm text-green-900 flex-1 truncate">{attachmentFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachmentFile(null)}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                >
                  <X size={16} className="text-green-600" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all">
                <Upload size={18} className="text-slate-400" />
                <span className="text-sm text-slate-600">Choose file or drag here</span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.csv,.xlsx,.xls,.doc,.docx"
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-slate-500">
              Accepted: PDF, CSV, Excel, Word (max 10MB)
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Advanced options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Pin Option */}
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className="flex items-center gap-3 cursor-pointer w-full"
              >
                <div className={`w-10 h-6 rounded-full transition-colors relative ${isPinned ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${isPinned ? 'left-4' : 'left-0.5'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Pin size={16} className={isPinned ? 'text-blue-600' : 'text-slate-500'} />
                  <span className="text-sm text-slate-700">Pin to top</span>
                </div>
              </button>

              {/* Urgent Option */}
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className="flex items-center gap-3 cursor-pointer w-full"
              >
                <div className={`w-10 h-6 rounded-full transition-colors relative ${isUrgent ? 'bg-red-500' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${isUrgent ? 'left-4' : 'left-0.5'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Bell size={16} className={isUrgent ? 'text-red-500' : 'text-slate-500'} />
                  <span className="text-sm text-slate-700">Mark as urgent</span>
                </div>
              </button>

              {/* Expiration Date */}
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                  <Clock size={16} className="text-slate-500" />
                  Auto-expire after
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview hint */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            {targetGroups.length === 0 
              ? '📢 This will be visible to all team members'
              : `📢 This will be visible to ${targetGroups.length} selected group${targetGroups.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Announcements List for Coach Dashboard
export function AnnouncementsList({ onEdit }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting announcement');
    }
  };

  const typeConfig = {
    alert: { color: 'text-red-600', bg: 'bg-red-50' },
    practice: { color: 'text-amber-600', bg: 'bg-amber-50' },
    meet: { color: 'text-blue-600', bg: 'bg-blue-50' },
    social: { color: 'text-purple-600', bg: 'bg-purple-50' },
    admin: { color: 'text-slate-600', bg: 'bg-slate-50' },
    info: { color: 'text-cyan-600', bg: 'bg-cyan-50' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 text-center">
          <Megaphone size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No announcements yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first announcement to get started</p>
        </div>
      ) : (
        announcements.map(announcement => {
          const config = typeConfig[announcement.type] || typeConfig.info;
          return (
            <div 
              key={announcement.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                      {announcement.type}
                    </span>
                    {announcement.is_pinned && (
                      <Pin size={12} className="text-blue-500" />
                    )}
                    {announcement.is_urgent && (
                      <AlertTriangle size={12} className="text-red-500" />
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {announcement.title && (
                    <h4 className="font-semibold text-slate-800 mb-1">{announcement.title}</h4>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-2">{announcement.content}</p>
                  
                  {/* Link */}
                  {announcement.link_url && (
                    <a
                      href={announcement.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 size={14} />
                      <span className="truncate">{announcement.link_title || 'View Link'}</span>
                    </a>
                  )}
                  
                  {/* Attachment */}
                  {announcement.attachment_url && (
                    <a
                      href={announcement.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-2 text-sm text-slate-600 hover:text-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Paperclip size={14} />
                      <span className="truncate">{announcement.attachment_filename || 'Attachment'}</span>
                    </a>
                  )}
                  
                  <p className="text-xs text-slate-400 mt-2">
                    {announcement.target_groups 
                      ? `${announcement.target_groups.length} groups targeted`
                      : 'Team-wide'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(announcement)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit3 size={16} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Full Announcements Manager Page for Coaches
export default function AnnouncementsManager({ onBack }) {
  const [showComposer, setShowComposer] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setShowComposer(false);
    setEditingAnnouncement(null);
    setRefreshKey(k => k + 1);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowComposer(true);
  };

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Announcements</h2>
            <p className="text-sm text-slate-500">Manage team communications</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setShowComposer(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          <Megaphone size={18} />
          <span className="hidden md:inline">New Post</span>
        </button>
      </header>

      {/* List */}
      <AnnouncementsList key={refreshKey} onEdit={handleEdit} />

      {/* Composer Modal */}
      {showComposer && (
        <AnnouncementComposer
          onClose={() => {
            setShowComposer(false);
            setEditingAnnouncement(null);
          }}
          onSuccess={handleSuccess}
          editingAnnouncement={editingAnnouncement}
        />
      )}
    </div>
  );
}
