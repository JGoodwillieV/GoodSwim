// src/ParentCalendar.jsx
// Unified calendar view for parents - shows meets, practices, and team events
// Includes export to Google/iCal/Outlook functionality

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  Calendar, Trophy, Waves, Users, MapPin, Clock, Download,
  ExternalLink, Phone, Mail, Loader2, ChevronRight, X,
  Heart, DollarSign, Share2
} from 'lucide-react';
import { 
  downloadICSFile, 
  openInGoogleCalendar, 
  formatEventDateRange 
} from './utils/calendarExport';

// Import centralized utilities
import { formatDateSafe, formatTimeOfDay } from './utils/dateUtils';

// Alias for backward compatibility
const formatDate = formatDateSafe;
const formatTime = formatTimeOfDay;

// Get icon based on event type/source
const getEventIcon = (event) => {
  if (event.source === 'meet') return Trophy;
  if (event.source === 'practice') return Waves;
  if (event.event_type === 'social') return Heart;
  if (event.event_type === 'office_hours') return Clock;
  if (event.event_type === 'team_meeting') return Users;
  if (event.event_type === 'fundraiser') return DollarSign;
  return Calendar;
};

// Get color based on event type/source
const getEventColor = (event) => {
  if (event.source === 'meet') return 'blue';
  if (event.source === 'practice') return 'amber';
  if (event.event_type === 'social') return 'purple';
  if (event.event_type === 'office_hours') return 'emerald';
  if (event.event_type === 'fundraiser') return 'green';
  return 'slate';
};

// Event Detail Modal
function EventDetailModal({ event, onClose }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const Icon = getEventIcon(event);
  const color = getEventColor(event);

  const handleGoogleCalendar = () => {
    openInGoogleCalendar(event);
  };

  const handleDownloadICS = () => {
    downloadICSFile(event);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r from-${color}-500 to-${color}-600 text-white`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center`}>
              <Icon size={24} />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
          <h2 className="text-2xl font-bold mt-4">{event.title}</h2>
          <p className="text-white/90 mt-1">{formatEventDateRange(event)}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Details</h3>
              <p className="text-slate-600">{event.description}</p>
            </div>
          )}

          {/* Date/Time Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-slate-500 mt-0.5" />
              <div>
                <div className="font-medium text-slate-800">
                  {formatDate(event.start_date)}
                  {event.end_date && event.end_date !== event.start_date && (
                    <> - {formatDate(event.end_date)}</>
                  )}
                </div>
                {event.start_time && !event.all_day && (
                  <div className="text-sm text-slate-600">
                    {formatTime(event.start_time)}
                    {event.end_time && <> - {formatTime(event.end_time)}</>}
                  </div>
                )}
                {event.all_day && (
                  <div className="text-sm text-slate-600">All day</div>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location_name && (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-slate-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-800">{event.location_name}</div>
                  {event.location_address && (
                    <div className="text-sm text-slate-600">{event.location_address}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          {(event.contact_name || event.contact_email || event.contact_phone) && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Contact</h3>
              <div className="space-y-2">
                {event.contact_name && (
                  <div className="text-slate-600">{event.contact_name}</div>
                )}
                {event.contact_email && (
                  <a
                    href={`mailto:${event.contact_email}`}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Mail size={16} />
                    {event.contact_email}
                  </a>
                )}
                {event.contact_phone && (
                  <a
                    href={`tel:${event.contact_phone}`}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Phone size={16} />
                    {event.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Links */}
          {(event.links && event.links.length > 0) && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Links</h3>
              <div className="space-y-2">
                {event.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <ExternalLink size={16} />
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Backwards compatibility: Show old external_link if no new links */}
          {(!event.links || event.links.length === 0) && event.external_link && (
            <a
              href={event.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink size={16} />
              More Information
            </a>
          )}
        </div>

        {/* Footer - Add to Calendar */}
        <div className="p-6 border-t space-y-3">
          <button
            onClick={handleGoogleCalendar}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
          >
            <Calendar size={18} />
            Add to Google Calendar
          </button>

          <button
            onClick={handleDownloadICS}
            className="w-full px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2 font-medium"
          >
            <Download size={18} />
            Download for iCal/Outlook
          </button>

          <p className="text-xs text-slate-500 text-center">
            Download works with Apple Calendar, Outlook, and other calendar apps
          </p>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, onClick }) {
  const Icon = getEventIcon(event);
  const color = getEventColor(event);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition text-left"
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 bg-${color}-50 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={`text-${color}-600`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800">{event.title}</h4>
          <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
            <span>{formatEventDateRange(event)}</span>
            {event.location_name && (
              <>
                <span>•</span>
                <span className="truncate">{event.location_name}</span>
              </>
            )}
          </p>
        </div>
        <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
      </div>
    </button>
  );
}

// Main Parent Calendar Component
export default function ParentCalendar({ userId, swimmerGroups = [] }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    loadEvents();
  }, [userId, swimmerGroups]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Team Events - load all and filter in JS
      const { data: teamEvents } = await supabase
        .from('team_events')
        .select('*')
        .order('start_date', { ascending: true });

      // Meets
      const { data: meets } = await supabase
        .from('meets')
        .select('*')
        .in('status', ['open', 'closed', 'completed'])
        .order('start_date', { ascending: true });

      // Practices (filtered by swimmer groups)
      let practicesQuery = supabase
        .from('practices')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (swimmerGroups.length > 0) {
        practicesQuery = practicesQuery.or(
          `training_group_id.in.(${swimmerGroups.join(',')}),training_group_id.is.null`
        );
      }

      const { data: practices } = await practicesQuery;

      // Filter team events by target groups
      const filteredTeamEvents = (teamEvents || []).filter(event => {
        // If target_groups is empty array or null, show to everyone
        if (!event.target_groups || event.target_groups.length === 0) {
          return true;
        }
        // If parent has swimmers in specified groups, show event
        if (swimmerGroups.length > 0) {
          return event.target_groups.some(group => swimmerGroups.includes(group));
        }
        return false;
      });

      // Combine and format all events
      const allEvents = [
        ...filteredTeamEvents.map(e => ({
          ...e,
          source: 'team_event',
          icon_type: e.event_type
        })),
        ...(meets || []).map(m => ({
          id: m.id,
          source: 'meet',
          title: m.name,
          description: null,
          event_type: 'meet',
          start_date: m.start_date,
          end_date: m.end_date,
          start_time: null,
          end_time: null,
          all_day: true,
          location_name: m.location_name,
          location_address: m.location_address,
          icon_type: 'meet'
        })),
        ...(practices || []).map(p => ({
          id: p.id,
          source: 'practice',
          title: p.title,
          description: p.description,
          event_type: 'practice',
          start_date: p.scheduled_date,
          end_date: null,
          start_time: p.scheduled_time,
          end_time: null,
          all_day: false,
          location_name: null,
          location_address: null,
          icon_type: 'practice'
        }))
      ];

      // Sort by date
      allEvents.sort((a, b) => {
        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);
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

  const filteredEvents = events.filter(event => {
    // Parse date as local time to avoid timezone shift
    const eventDateStr = event.end_date || event.start_date;
    const [year, month, day] = eventDateStr.split('T')[0].split('-');
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return eventDate >= today;
    } else if (filter === 'past') {
      return eventDate < today;
    }
    return true;
  });

  // Group events by month (parse as local time)
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const [year, month, day] = event.start_date.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={24} />
          <h3 className="font-bold text-lg">Team Calendar</h3>
        </div>
        <p className="text-indigo-100 text-sm">
          All meets, practices, and team events in one place. Tap any event to add it to your calendar.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
            filter === 'upcoming'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
            filter === 'past'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          Past
        </button>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Calendar size={48} className="mx-auto mb-4 text-slate-400 opacity-50" />
          <p className="text-slate-600">No events scheduled</p>
          <p className="text-sm text-slate-500 mt-1">Check back later for updates</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([month, monthEvents]) => (
            <div key={month}>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {month}
              </h4>
              <div className="space-y-2">
                {monthEvents.map(event => (
                  <EventCard
                    key={`${event.source}-${event.id}`}
                    event={event}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What to Expect */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="font-semibold text-slate-700 mb-2">What you'll see here:</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            Meet schedules with warmup times & locations
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Practice times filtered to your swimmer's group
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Office hours & coach availability
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
            Team social events & parties
          </li>
        </ul>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

