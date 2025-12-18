// src/CalendarManager.jsx
// Calendar management for coaches - create and manage team events

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  Calendar, Plus, Edit2, Trash2, Users, MapPin, Clock,
  ExternalLink, Phone, Mail, Loader2, X, Check, AlertCircle,
  Trophy, Waves, User as UserIcon, DollarSign, Heart, MoreVertical,
  ChevronLeft
} from 'lucide-react';

// Import centralized utilities
import { formatDateSafe, formatTimeOfDay } from './utils/dateUtils';

// Alias for backward compatibility
const formatDate = formatDateSafe;
const formatTime = formatTimeOfDay;

const EVENT_TYPES = [
  { value: 'social', label: 'Social Event', icon: Heart, color: 'purple' },
  { value: 'office_hours', label: 'Office Hours', icon: Clock, color: 'blue' },
  { value: 'team_meeting', label: 'Team Meeting', icon: Users, color: 'slate' },
  { value: 'fundraiser', label: 'Fundraiser', icon: DollarSign, color: 'green' },
  { value: 'volunteer', label: 'Volunteer Event', icon: Heart, color: 'pink' },
  { value: 'other', label: 'Other', icon: Calendar, color: 'gray' }
];

const getEventTypeInfo = (type) => {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
};

// Event Form Modal
function EventFormModal({ event, onSave, onClose, groups }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'other',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    all_day: false,
    location_name: '',
    location_address: '',
    target_groups: [],
    visible_to: 'everyone',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    links: [],
    external_link: '', // Keep for backwards compatibility
    ...event,
    // Ensure links is always an array (already set by spread or default above)
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddLink = () => {
    setFormData({
      ...formData,
      links: [...formData.links, { title: '', url: '' }]
    });
  };

  const handleRemoveLink = (index) => {
    setFormData({
      ...formData,
      links: formData.links.filter((_, i) => i !== index)
    });
  };

  const handleUpdateLink = (index, field, value) => {
    const updatedLinks = [...formData.links];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setFormData({ ...formData, links: updatedLinks });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start_date) {
      setError('Title and start date are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    let eventData; // Declare outside try block for error logging
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Filter out empty links
      const validLinks = (formData.links || []).filter(link => link.title && link.url);

      // Only include fields that should be saved (exclude source, isEditable, etc.)
      eventData = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        start_time: formData.all_day ? null : formData.start_time || null,
        end_time: formData.all_day ? null : formData.end_time || null,
        all_day: formData.all_day,
        location_name: formData.location_name || null,
        location_address: formData.location_address || null,
        target_groups: Array.isArray(formData.target_groups) ? formData.target_groups : [],
        visible_to: formData.visible_to,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        links: validLinks,
        external_link: formData.external_link || null,
        updated_at: new Date().toISOString()
      };
      
      if (event?.id) {
        // Update
        const { error: updateError } = await supabase
          .from('team_events')
          .update(eventData)
          .eq('id', event.id);
        
        if (updateError) throw updateError;
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('team_events')
          .insert({ ...eventData, created_by: user.id });
        
        if (insertError) throw insertError;
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving event:', err);
      // Show more detailed error message
      const errorMessage = err.message || 'Failed to save event. Please check all fields and try again.';
      setError(errorMessage);
      
      // Also log the full error details for debugging
      console.error('Full error details:', {
        error: err,
        eventData,
        formData,
        isUpdate: !!event?.id
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {event?.id ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Holiday Party"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {EVENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Event details..."
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock size={18} />
              Date & Time
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="all_day"
                checked={formData.all_day}
                onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="all_day" className="text-sm text-slate-600">
                All-day event
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={formData.start_date}
                />
              </div>
            </div>

            {!formData.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <MapPin size={18} />
              Location
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Venue Name
              </label>
              <input
                type="text"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Timberlake House"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St, City, State ZIP"
              />
            </div>
          </div>

          {/* Target Groups */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Users size={18} />
              Target Audience
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Training Groups (leave empty for all groups)
              </label>
              <div className="space-y-2">
                {groups.map(group => (
                  <label key={group} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.target_groups.includes(group)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            target_groups: [...formData.target_groups, group]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            target_groups: formData.target_groups.filter(g => g !== group)
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{group}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visibility
              </label>
              <select
                value={formData.visible_to}
                onChange={(e) => setFormData({ ...formData, visible_to: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="everyone">Everyone (Parents & Coaches)</option>
                <option value="parents_only">Parents Only</option>
                <option value="coaches_only">Coaches Only</option>
              </select>
            </div>
          </div>

          {/* Contact & Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Contact & Additional Info</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Coach Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="coach@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Multiple Links Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Links (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Link
                </button>
              </div>
              
              {formData.links.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Add links for RSVP, sign-ups, directions, etc.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.links.map((link, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => handleUpdateLink(index, 'title', e.target.value)}
                          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Link Title (e.g., RSVP)"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="https://..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-slate-50 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                {event?.id ? 'Update Event' : 'Create Event'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const typeInfo = getEventTypeInfo(event.event_type);
  const Icon = typeInfo.icon;

  const formatDateRange = () => {
    const start = formatDate(event.start_date);
    if (event.end_date && event.end_date !== event.start_date) {
      return `${start} - ${formatDate(event.end_date)}`;
    }
    return start;
  };

  return (
    <div className="bg-white border rounded-xl p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg bg-${typeInfo.color}-50 flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={`text-${typeInfo.color}-600`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-slate-800">{event.title}</h3>
            {event.isEditable && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-slate-100 rounded transition"
                >
                  <MoreVertical size={16} />
                </button>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 w-32">
                      <button
                        onClick={() => {
                          onEdit(event);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onDelete(event);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>{formatDateRange()}</span>
              {event.start_time && !event.all_day && (
                <span>• {formatTime(event.start_time)}</span>
              )}
            </div>

            {event.location_name && (
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{event.location_name}</span>
              </div>
            )}

            {event.target_groups && event.target_groups.length > 0 && (
              <div className="flex items-center gap-2">
                <Users size={14} />
                <span>{event.target_groups.join(', ')}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Show links if available */}
          {event.links && event.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {event.links.slice(0, 2).map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  {link.title}
                </a>
              ))}
              {event.links.length > 2 && (
                <span className="text-xs text-slate-500">+{event.links.length - 2} more</span>
              )}
            </div>
          )}

          <div className="mt-2">
            <span className={`inline-block px-2 py-0.5 text-xs rounded-full bg-${typeInfo.color}-100 text-${typeInfo.color}-700`}>
              {typeInfo.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Calendar Manager Component
export default function CalendarManager({ onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    loadEvents();
    loadGroups();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Load custom team events
      const { data: teamEvents, error: teamEventsError } = await supabase
        .from('team_events')
        .select('*')
        .order('start_date', { ascending: true });

      if (teamEventsError) throw teamEventsError;

      // Load meets
      const { data: meets, error: meetsError } = await supabase
        .from('meets')
        .select('*')
        .in('status', ['open', 'closed', 'completed'])
        .order('start_date', { ascending: true });

      if (meetsError) console.error('Error loading meets:', meetsError);

      // Load practices
      const { data: practices, error: practicesError } = await supabase
        .from('practices')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (practicesError) console.error('Error loading practices:', practicesError);

      // Combine all events
      const allEvents = [
        ...(teamEvents || []).map(e => ({ ...e, source: 'team_event', isEditable: true })),
        ...(meets || []).map(m => ({
          id: m.id,
          source: 'meet',
          title: m.name,
          description: `Swim meet - ${m.name}`,
          event_type: 'meet',
          start_date: m.start_date,
          end_date: m.end_date,
          start_time: null,
          end_time: null,
          all_day: true,
          location_name: m.location_name,
          location_address: m.location_address,
          target_groups: [],
          visible_to: 'everyone',
          isEditable: false
        })),
        ...(practices || []).map(p => ({
          id: p.id,
          source: 'practice',
          title: p.title,
          description: `Practice - ${p.training_group_id || 'All Groups'}`,
          event_type: 'practice',
          start_date: p.scheduled_date,
          end_date: null,
          start_time: p.scheduled_time,
          end_time: null,
          all_day: false,
          location_name: null,
          location_address: null,
          target_groups: p.training_group_id ? [p.training_group_id] : [],
          visible_to: 'everyone',
          isEditable: false
        }))
      ];

      // Sort by date (parse as local time)
      allEvents.sort((a, b) => {
        const [yearA, monthA, dayA] = a.start_date.split('T')[0].split('-');
        const [yearB, monthB, dayB] = b.start_date.split('T')[0].split('-');
        const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
        const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
        // If same date, sort by time
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        return 0;
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('swimmers')
        .select('group_name')
        .not('group_name', 'is', null);

      if (error) throw error;

      const uniqueGroups = [...new Set(data.map(s => s.group_name))].filter(Boolean);
      setGroups(uniqueGroups.sort());
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleDelete = async (event) => {
    // Only allow deleting team events
    if (!event.isEditable) {
      alert('This event cannot be deleted from the calendar. Please manage it in the Meets or Practices section.');
      return;
    }

    if (!confirm(`Delete "${event.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('team_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const filteredEvents = events.filter(event => {
    // Use end_date if available, otherwise use start_date
    const eventDateStr = event.end_date || event.start_date;
    // Parse date as local time to avoid timezone shift
    const [year, month, day] = eventDateStr.split('T')[0].split('-');
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    if (filter === 'upcoming') {
      return eventDate >= now;
    } else if (filter === 'past') {
      return eventDate < now;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Calendar size={28} />
                Team Events
              </h1>
              <p className="text-slate-600 mt-1">
                Create and manage team events like socials, office hours, and fundraisers.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'upcoming'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'past'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Calendar size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">No events found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={(e) => {
                setEditingEvent(e);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <EventFormModal
          event={editingEvent}
          onSave={() => {
            setShowForm(false);
            setEditingEvent(null);
            loadEvents();
          }}
          onClose={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
          groups={groups}
        />
      )}
    </div>
  );
}

