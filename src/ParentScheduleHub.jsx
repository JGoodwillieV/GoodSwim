// src/ParentScheduleHub.jsx
// Unified parent schedule view with Practice Times, Calendar, and Meets tabs
// Similar to coach ScheduleHub but tailored for parent experience

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  Calendar, ChevronLeft, ChevronRight, Trophy, Waves, Heart,
  Clock, MapPin, UserCircle, CalendarDays, LayoutList, Loader2,
  X, Download, Mail, Phone, ExternalLink, Dumbbell
} from 'lucide-react';
import { formatDateSafe, formatTimeOfDay } from './utils/dateUtils';
import { 
  downloadICSFile, 
  openInGoogleCalendar, 
  formatEventDateRange 
} from './utils/calendarExport';
import ParentMeetsView from './ParentMeetsView';
import { PracticeScheduleCard } from './ParentPracticeSchedule';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

// Color schemes for different item types
const TYPE_COLORS = {
  meet: {
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    border: 'border-amber-200',
    borderAccent: 'border-l-amber-500',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500 to-amber-600',
    icon: Trophy,
    label: 'Meet'
  },
  practice: {
    bg: 'bg-sky-50',
    bgHover: 'hover:bg-sky-100',
    border: 'border-sky-200',
    borderAccent: 'border-l-sky-500',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    gradient: 'from-sky-500 to-sky-600',
    icon: Waves,
    label: 'Practice'
  },
  office_hours: {
    bg: 'bg-teal-50',
    bgHover: 'hover:bg-teal-100',
    border: 'border-teal-200',
    borderAccent: 'border-l-teal-500',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
    gradient: 'from-teal-500 to-teal-600',
    icon: UserCircle,
    label: 'Office Hours'
  },
  event: {
    bg: 'bg-violet-50',
    bgHover: 'hover:bg-violet-100',
    border: 'border-violet-200',
    borderAccent: 'border-l-violet-500',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    gradient: 'from-violet-500 to-violet-600',
    icon: Heart,
    label: 'Event'
  }
};

// Get month calendar data
function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startPadding = firstDay.getDay();
  
  const days = [];
  
  for (let i = 0; i < startPadding; i++) {
    const prevDate = new Date(year, month, -startPadding + i + 1);
    days.push({
      date: prevDate.toISOString().split('T')[0],
      dayNum: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(year, month, i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: i,
      isCurrentMonth: true,
      isToday: date.toDateString() === new Date().toDateString()
    });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({
      date: nextDate.toISOString().split('T')[0],
      dayNum: i,
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  return days;
}

// Get week dates
function getWeekDates(startDate) {
  const dates = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay());
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push({
      date: date.toISOString().split('T')[0],
      dayNum: date.getDate(),
      dayName: DAYS[i],
      isToday: date.toDateString() === new Date().toDateString()
    });
  }
  
  return dates;
}

// Event Detail Modal Component
function EventDetailModal({ item, onClose }) {
  const colors = TYPE_COLORS[item.type] || TYPE_COLORS.event;
  const Icon = colors.icon;
  const isOfficeHours = item.type === 'office_hours';

  // Format the event for calendar export
  const eventForExport = {
    title: isOfficeHours ? `Office Hours - ${item.coach || ''}` : item.title,
    start_date: item.date,
    end_date: item.endDate || item.date,
    start_time: item.time,
    end_time: item.endTime,
    location_name: item.location,
    description: item.original?.description || '',
    all_day: !item.time
  };

  const handleGoogleCalendar = () => {
    openInGoogleCalendar(eventForExport);
  };

  const handleDownloadICS = () => {
    downloadICSFile(eventForExport);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${colors.gradient} text-white`}>
          <div className="flex items-start justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon size={24} />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <h2 className="text-2xl font-bold">
              {isOfficeHours ? 'Office Hours' : item.title}
            </h2>
            {isOfficeHours && item.coach && (
              <span className="bg-white/20 px-2 py-1 rounded-lg text-sm font-medium">
                {item.coach}
              </span>
            )}
          </div>
          <p className="text-white/90 mt-1">
            {formatDateSafe(item.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Date/Time Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            {item.time && (
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-slate-500" />
                <div className="font-medium text-slate-800">
                  {formatTimeOfDay(item.time)}
                  {item.endTime && ` - ${formatTimeOfDay(item.endTime)}`}
                </div>
              </div>
            )}
            
            {item.location && (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-slate-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-800">{item.location}</div>
                  {item.original?.location_address && (
                    <div className="text-sm text-slate-600">{item.original.location_address}</div>
                  )}
                </div>
              </div>
            )}

            {item.endDate && item.endDate !== item.date && (
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-slate-500" />
                <div className="text-slate-800">
                  Ends: {formatDateSafe(item.endDate, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {item.original?.description && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Details</h3>
              <p className="text-slate-600">{item.original.description}</p>
            </div>
          )}

          {/* Contact Info for events */}
          {(item.original?.contact_name || item.original?.contact_email || item.original?.contact_phone) && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Contact</h3>
              <div className="space-y-2">
                {item.original.contact_name && (
                  <div className="text-slate-600">{item.original.contact_name}</div>
                )}
                {item.original.contact_email && (
                  <a
                    href={`mailto:${item.original.contact_email}`}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Mail size={16} />
                    {item.original.contact_email}
                  </a>
                )}
                {item.original.contact_phone && (
                  <a
                    href={`tel:${item.original.contact_phone}`}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Phone size={16} />
                    {item.original.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Links */}
          {item.original?.links && item.original.links.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Links</h3>
              <div className="space-y-2">
                {item.original.links.map((link, index) => (
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

          {/* Type badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
              <Icon size={14} />
              {colors.label}
            </span>
            {item.status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.status === 'open' ? 'bg-green-100 text-green-700' : 
                item.status === 'completed' ? 'bg-slate-100 text-slate-600' : 
                'bg-slate-100 text-slate-600'
              }`}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            )}
          </div>
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

// Calendar View Component
function CalendarView({ user }) {
  const [meets, setMeets] = useState([]);
  const [practices, setPractices] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: meetsData } = await supabase
        .from('meets')
        .select('*')
        .in('status', ['open', 'closed', 'completed', 'draft'])
        .order('start_date');
      setMeets(meetsData || []);

      const { data: practicesData } = await supabase
        .from('practices')
        .select('*')
        .order('scheduled_date');
      setPractices(practicesData || []);

      const { data: eventsData } = await supabase
        .from('team_events')
        .select('*')
        .order('start_date');
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Normalize all items
  const allItems = useMemo(() => {
    const items = [];
    
    meets.forEach(meet => {
      items.push({
        id: meet.id,
        type: 'meet',
        title: meet.name,
        date: meet.start_date,
        endDate: meet.end_date,
        time: null,
        location: meet.location_name,
        status: meet.status,
        original: meet
      });
    });
    
    practices.forEach(practice => {
      items.push({
        id: practice.id,
        type: 'practice',
        title: practice.title || 'Practice',
        date: practice.scheduled_date,
        endDate: null,
        time: practice.scheduled_time,
        location: null,
        status: practice.status,
        original: practice
      });
    });
    
    events.forEach(event => {
      const isOfficeHours = event.event_type === 'office_hours';
      let coachName = null;
      if (isOfficeHours) {
        coachName = event.description || (event.title?.includes(' - ') ? event.title.split(' - ')[1] : null);
      }
      items.push({
        id: event.id,
        type: isOfficeHours ? 'office_hours' : 'event',
        title: isOfficeHours ? 'Office Hours' : event.title,
        date: event.start_date,
        endDate: event.end_date,
        time: event.start_time,
        endTime: event.end_time,
        location: event.location_name,
        eventType: event.event_type,
        coach: coachName,
        original: event
      });
    });
    
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [meets, practices, events]);

  // Get items for a specific date
  const getItemsForDate = (date) => {
    return allItems.filter(item => {
      if (item.date === date) return true;
      if (item.endDate && date > item.date && date <= item.endDate) return true;
      return false;
    });
  };

  // Navigation
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Compact Schedule Item for calendar cells - Mobile optimized
  const CompactScheduleItem = ({ item, onClick }) => {
    const colors = TYPE_COLORS[item.type] || TYPE_COLORS.event;
    const isOfficeHours = item.type === 'office_hours';
    
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(item); }}
        className={`${colors.bg} ${colors.border} border rounded px-1 py-0.5 w-full text-left ${colors.bgHover} transition-all cursor-pointer`}
      >
        <div className="flex items-center gap-0.5 min-w-0">
          <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
          <span className={`text-[9px] sm:text-[10px] font-medium ${colors.text} truncate leading-tight`}>
            {isOfficeHours ? (item.coach ? `OH-${item.coach.charAt(0)}` : 'OH') : item.title}
          </span>
        </div>
      </button>
    );
  };

  // Full Schedule Item for upcoming list
  const ScheduleItem = ({ item, onClick }) => {
    const colors = TYPE_COLORS[item.type] || TYPE_COLORS.event;
    const Icon = colors.icon;
    const isOfficeHours = item.type === 'office_hours';
    
    return (
      <button
        onClick={() => onClick(item)}
        className={`${colors.bg} border-l-4 ${colors.borderAccent} rounded-lg p-4 shadow-sm ${colors.bgHover} transition-all w-full text-left`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white/70 ${colors.text}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold ${colors.text} uppercase tracking-wide`}>{colors.label}</span>
              {isOfficeHours && item.coach && (
                <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-medium">
                  {item.coach}
                </span>
              )}
            </div>
            <h4 className="font-bold text-slate-800 truncate">
              {isOfficeHours ? 'Office Hours' : item.title}
            </h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDateSafe(item.date, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              {item.time && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatTimeOfDay(item.time)}
                  {item.endTime && ` - ${formatTimeOfDay(item.endTime)}`}
                </span>
              )}
              {item.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {item.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const weekDays = getWeekDates(currentDate);
  const monthDays = getMonthDays(currentDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 min-w-[160px] sm:min-w-[200px] text-center">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
          <button 
            onClick={handleToday}
            className="px-2 sm:px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Today
          </button>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'week' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <LayoutList size={16} />
            <span className="hidden sm:inline">Week</span>
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'month' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <CalendarDays size={16} />
            <span className="hidden sm:inline">Month</span>
          </button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {weekDays.map((day, idx) => (
              <div key={idx} className={`p-2 sm:p-3 text-center border-r last:border-r-0 border-slate-200 ${day.isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">{day.dayName}</div>
                <div className={`text-sm sm:text-lg font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                  {day.dayNum}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[200px] sm:min-h-[300px]">
            {weekDays.map((day, idx) => {
              const dayItems = getItemsForDate(day.date);
              return (
                <div key={idx} className={`p-1 sm:p-2 border-r last:border-r-0 border-slate-100 ${day.isToday ? 'bg-blue-50/30' : ''}`}>
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayItems.slice(0, 4).map(item => (
                      <CompactScheduleItem key={item.id} item={item} onClick={setSelectedItem} />
                    ))}
                    {dayItems.length > 4 && (
                      <div className="text-[9px] sm:text-xs text-slate-500 text-center py-0.5">
                        +{dayItems.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {DAYS.map(day => (
              <div key={day} className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-semibold text-slate-500">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, idx) => {
              const dayItems = getItemsForDate(day.date);
              return (
                <div
                  key={idx}
                  className={`min-h-[70px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-slate-100 ${
                    !day.isCurrentMonth ? 'bg-slate-50/50' : ''
                  } ${day.isToday ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`text-xs sm:text-sm mb-0.5 sm:mb-1 ${
                    day.isToday 
                      ? 'w-5 h-5 sm:w-7 sm:h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] sm:text-sm' 
                      : day.isCurrentMonth 
                        ? 'text-slate-700 font-medium' 
                        : 'text-slate-400'
                  }`}>
                    {day.dayNum}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 2).map(item => (
                      <CompactScheduleItem key={item.id} item={item} onClick={setSelectedItem} />
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[9px] sm:text-xs text-slate-500 text-center">
                        +{dayItems.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events List */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800">Upcoming</h3>
        {allItems
          .filter(item => new Date(item.date) >= new Date(new Date().toDateString()))
          .slice(0, 5)
          .map(item => (
            <ScheduleItem key={item.id} item={item} onClick={setSelectedItem} />
          ))}
        {allItems.filter(item => new Date(item.date) >= new Date(new Date().toDateString())).length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p>No upcoming events</p>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedItem && (
        <EventDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

// Main Parent Schedule Hub Component
export default function ParentScheduleHub({ user, swimmerGroups = [] }) {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'practice'
              ? 'bg-white border border-b-white border-slate-200 -mb-[3px] text-blue-600'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Waves size={18} />
          <span className="hidden sm:inline">Practice Times</span>
          <span className="sm:hidden">Practice</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-white border border-b-white border-slate-200 -mb-[3px] text-blue-600'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Calendar size={18} />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('meets')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'meets'
              ? 'bg-white border border-b-white border-slate-200 -mb-[3px] text-blue-600'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Trophy size={18} />
          Meets
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'practice' && (
        <PracticeScheduleCard swimmerGroups={swimmerGroups} />
      )}
      {activeTab === 'calendar' && <CalendarView user={user} />}
      {activeTab === 'meets' && <ParentMeetsView user={user} />}
    </div>
  );
}
