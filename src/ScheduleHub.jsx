// src/ScheduleHub.jsx
// Unified schedule view combining Meets, Practices, and Team Events
// Includes Workout Planner for creating practice workouts

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trophy, Waves, Heart,
  Users, Clock, MapPin, Filter, LayoutGrid, List, ChevronDown,
  DollarSign, AlertCircle, X, Check, Loader2, CalendarDays, LayoutList,
  UserCircle, ClipboardList
} from 'lucide-react';
import { formatDateSafe, formatTimeOfDay, parseDateSafe } from './utils/dateUtils';
import WorkoutPlanner from './WorkoutPlanner';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

// Staff/Coaches for office hours
const STAFF_MEMBERS = [
  { id: 'joe', name: 'Joe' },
  { id: 'jack', name: 'Jack' },
  { id: 'harrison', name: 'Harrison' },
  { id: 'nikki', name: 'Nikki' },
  { id: 'max', name: 'Max' },
];

// Filter options
const FILTERS = [
  { id: 'all', label: 'All', icon: Calendar },
  { id: 'meets', label: 'Meets', icon: Trophy },
  { id: 'practices', label: 'Practices', icon: Waves },
  { id: 'office_hours', label: 'Office Hours', icon: UserCircle },
  { id: 'events', label: 'Events', icon: Heart },
];

// Color schemes for different item types
const TYPE_COLORS = {
  meet: {
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    border: 'border-amber-200',
    borderAccent: 'border-l-amber-500',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
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
    icon: Waves,
    label: 'Practice'
  },
  scheduled_practice: {
    bg: 'bg-sky-50',
    bgHover: 'hover:bg-sky-100',
    border: 'border-sky-200',
    borderAccent: 'border-l-sky-500',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
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
    icon: Heart,
    label: 'Event'
  }
};

// Get week dates starting from a given date
function getWeekDates(startDate) {
  const dates = [];
  const start = new Date(startDate);
  // Adjust to start of week (Sunday)
  start.setDate(start.getDate() - start.getDay());
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push({
      date: date.toISOString().split('T')[0],
      dayNum: date.getDate(),
      dayName: DAYS[date.getDay()],
      dayFull: DAYS_FULL[date.getDay()],
      month: MONTHS[date.getMonth()],
      isToday: date.toDateString() === new Date().toDateString(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    });
  }
  return dates;
}

// Get month calendar data
function getMonthCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();
  
  const days = [];
  
  // Add padding for days before month starts
  for (let i = 0; i < startPadding; i++) {
    const prevDate = new Date(year, month, -startPadding + i + 1);
    days.push({
      date: prevDate.toISOString().split('T')[0],
      dayNum: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Add days of current month
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(year, month, i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: i,
      isCurrentMonth: true,
      isToday: date.toDateString() === new Date().toDateString()
    });
  }
  
  // Add padding for days after month ends
  const remaining = 42 - days.length; // 6 rows * 7 days
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

// Quick Create Modal Component
function QuickCreateModal({ isOpen, onClose, type, onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('');
  
  const colors = TYPE_COLORS[type] || TYPE_COLORS.event;
  const Icon = colors.icon;
  
  const isOfficeHours = type === 'office_hours';
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isOfficeHours) {
      if (!selectedCoach || !time || !endTime) return;
      onSubmit({ 
        title: 'Office Hours', 
        date, 
        time,
        endTime,
        coach: selectedCoach,
        type 
      });
    } else {
      if (!title.trim()) return;
      onSubmit({ title, date, time, location, type });
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('');
      setEndTime('');
      setLocation('');
      setSelectedCoach('');
    }
  }, [isOpen, type]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full sm:w-auto sm:min-w-[400px] sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-slide-up sm:animate-none">
        {/* Header */}
        <div className={`${colors.bg} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/50`}>
              <Icon size={20} className={colors.text} />
            </div>
            <div>
              <h3 className={`font-bold ${colors.text}`}>
                {isOfficeHours ? 'Schedule Office Hours' : `Quick Add ${colors.label}`}
              </h3>
              <p className="text-xs text-slate-600">
                {isOfficeHours ? 'Set availability for a coach' : `Create a new ${type}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/30 rounded-lg transition">
            <X size={20} className="text-slate-600" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isOfficeHours ? (
            /* Office Hours Form */
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coach/Staff *</label>
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white text-slate-700 appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a coach...</option>
                  {STAFF_MEMBERS.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            /* Standard Form */
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'meet' ? 'Spring Invitational' : type === 'practice' ? 'Morning Practice' : 'Team Dinner'}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  autoFocus
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {type !== 'practice' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Pool name or venue"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </>
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (isOfficeHours ? !selectedCoach : !title.trim())}
              className={`flex-1 px-4 py-3 ${colors.bg} ${colors.text} rounded-xl font-medium ${colors.bgHover} transition flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isOfficeHours ? 'Schedule' : `Create ${colors.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ScheduleHub({ 
  onNavigate,
  onCreateMeet,
  onCreatePractice,
  onCreatePracticeFromSchedule,  // New: creates practice with pre-filled schedule data
  onCreateEvent,
  onViewMeet,
  onViewPractice,
  onViewEvent,
  onManagePracticeSchedule
}) {
  const [mainView, setMainView] = useState('workouts'); // 'calendar' or 'workouts'
  const [viewMode, setViewMode] = useState('week'); // 'week', 'month', or 'agenda'
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState(null);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  
  // Data states
  const [meets, setMeets] = useState([]);
  const [practices, setPractices] = useState([]);
  const [events, setEvents] = useState([]);
  const [practiceSchedules, setPracticeSchedules] = useState([]);
  const [scheduleExceptions, setScheduleExceptions] = useState([]);

  // Swipe handling for mobile
  const touchStartX = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'agenda') {
      // Agenda shows next 30 days
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);
      return {
        start: today.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      };
    } else if (viewMode === 'week') {
      const week = getWeekDates(currentDate);
      return { start: week[0].date, end: week[6].date };
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
      };
    }
  }, [currentDate, viewMode]);

  // Fetch all schedule data
  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch meets - meets table doesn't have coach_id, filter by status
      const { data: meetsData, error: meetsError } = await supabase
        .from('meets')
        .select('*')
        .in('status', ['draft', 'open', 'closed', 'completed'])
        .order('start_date');

      if (meetsError) {
        console.error('Error fetching meets:', meetsError);
      }

      // Filter meets that overlap with the date range
      const filteredMeets = (meetsData || []).filter(meet => {
        const meetStart = meet.start_date;
        const meetEnd = meet.end_date || meet.start_date;
        // Meet overlaps if it starts before range ends AND ends after range starts
        return meetStart <= dateRange.end && meetEnd >= dateRange.start;
      });

      // Fetch practices
      const { data: practicesData, error: practicesError } = await supabase
        .from('practices')
        .select('*')
        .eq('coach_id', user.id)
        .gte('scheduled_date', dateRange.start)
        .lte('scheduled_date', dateRange.end)
        .order('scheduled_date');

      if (practicesError) {
        console.error('Error fetching practices:', practicesError);
      }

      // Fetch team events
      const { data: eventsData, error: eventsError } = await supabase
        .from('team_events')
        .select('*')
        .order('start_date');

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
      }

      // Filter events that overlap with the date range
      const filteredEvents = (eventsData || []).filter(event => {
        const eventStart = event.start_date;
        const eventEnd = event.end_date || event.start_date;
        return eventStart <= dateRange.end && eventEnd >= dateRange.start;
      });

      // Fetch recurring practice schedules (for generating practice slots)
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('practice_schedules')
        .select('*')
        .lte('season_start_date', dateRange.end)
        .gte('season_end_date', dateRange.start)
        .order('start_time', { ascending: true });

      if (schedulesError) {
        console.error('Error fetching practice schedules:', schedulesError);
      }

      // Fetch schedule exceptions
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('practice_schedule_exceptions')
        .select('*')
        .gte('exception_date', dateRange.start)
        .lte('exception_date', dateRange.end);

      if (exceptionsError) {
        console.error('Error fetching schedule exceptions:', exceptionsError);
      }

      console.log('Schedule data fetched:', { 
        meetsTotal: meetsData?.length || 0,
        meetsFiltered: filteredMeets?.length || 0, 
        practices: practicesData?.length || 0, 
        eventsTotal: eventsData?.length || 0,
        eventsFiltered: filteredEvents?.length || 0,
        practiceSchedules: schedulesData?.length || 0,
        exceptions: exceptionsData?.length || 0,
        dateRange 
      });

      setMeets(filteredMeets || []);
      setPractices(practicesData || []);
      setEvents(filteredEvents || []);
      setPracticeSchedules(schedulesData || []);
      setScheduleExceptions(exceptionsData || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick create handler
  const handleQuickCreate = async (data) => {
    setQuickCreateLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (data.type === 'meet') {
        await supabase.from('meets').insert({
          name: data.title,
          start_date: data.date,
          end_date: data.date,
          location_name: data.location || null,
          status: 'draft'
        });
      } else if (data.type === 'practice') {
        await supabase.from('practices').insert({
          coach_id: user.id,
          title: data.title,
          scheduled_date: data.date,
          scheduled_time: data.time || null,
          status: 'scheduled'
        });
      } else if (data.type === 'office_hours') {
        // Get the coach name from the selected coach id
        const coachName = STAFF_MEMBERS.find(s => s.id === data.coach)?.name || data.coach;
        await supabase.from('team_events').insert({
          created_by: user.id,
          title: `Office Hours - ${coachName}`,
          description: coachName, // Store coach name in description for easy retrieval
          start_date: data.date,
          start_time: data.time || null,
          end_time: data.endTime || null,
          event_type: 'office_hours'
        });
      } else if (data.type === 'event') {
        await supabase.from('team_events').insert({
          created_by: user.id,
          title: data.title,
          start_date: data.date,
          start_time: data.time || null,
          location_name: data.location || null,
          event_type: 'other'
        });
      }
      
      setQuickCreateType(null);
      fetchAllData();
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setQuickCreateLoading(false);
    }
  };

  // Generate scheduled practice slots from recurring schedules
  const generateScheduledSlots = useMemo(() => {
    const slots = [];
    
    // Generate dates for the current view range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      
      // Find schedules for this day of week
      const daySchedules = practiceSchedules.filter(s => 
        s.day_of_week === dayOfWeek &&
        dateStr >= s.season_start_date &&
        dateStr <= s.season_end_date
      );
      
      daySchedules.forEach(schedule => {
        // Check for exceptions on this date
        const exception = scheduleExceptions.find(e => 
          e.exception_date === dateStr &&
          (e.group_name === null || e.group_name === schedule.group_name) &&
          (e.activity_type === null || e.activity_type === schedule.activity_type)
        );
        
        // Skip if canceled
        if (exception?.exception_type === 'canceled') return;
        
        // Check if there's already a practice created for this slot
        const matchingPractice = practices.find(p => 
          p.scheduled_date === dateStr &&
          p.scheduled_time === schedule.start_time &&
          (p.training_group_id === schedule.group_name || p.title?.includes(schedule.group_name))
        );
        
        const slotId = `schedule-${schedule.id}-${dateStr}`;
        
        slots.push({
          id: slotId,
          scheduleId: schedule.id,
          type: 'scheduled_practice',
          title: schedule.group_name,
          groupName: schedule.group_name,
          activityType: schedule.activity_type,
          date: dateStr,
          time: exception?.new_start_time || schedule.start_time,
          endTime: exception?.new_end_time || schedule.end_time,
          location: schedule.location_name,
          isModified: exception?.exception_type === 'modified',
          modifiedReason: exception?.reason,
          hasWorkout: !!matchingPractice,
          linkedPracticeId: matchingPractice?.id,
          linkedPractice: matchingPractice,
          yards: matchingPractice?.total_yards,
          original: schedule
        });
      });
    }
    
    return slots;
  }, [dateRange, practiceSchedules, scheduleExceptions, practices]);

  // Combine and normalize all items for display
  const allItems = useMemo(() => {
    const items = [];
    
    // Add meets
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
    
    // Add scheduled practice slots (from recurring schedule)
    generateScheduledSlots.forEach(slot => {
      items.push(slot);
    });
    
    // Add individual practices that AREN'T linked to a scheduled slot
    // (to avoid duplicates)
    const linkedPracticeIds = new Set(
      generateScheduledSlots
        .filter(s => s.linkedPracticeId)
        .map(s => s.linkedPracticeId)
    );
    
    practices.forEach(practice => {
      // Skip if this practice is already represented by a scheduled slot
      if (linkedPracticeIds.has(practice.id)) return;
      
      items.push({
        id: practice.id,
        type: 'practice',
        title: practice.title || 'Practice',
        date: practice.scheduled_date,
        endDate: null,
        time: practice.scheduled_time,
        endTime: practice.end_time,
        location: null,
        status: practice.status,
        yards: practice.total_yards,
        original: practice
      });
    });
    
    // Add events (including office hours)
    events.forEach(event => {
      const isOfficeHours = event.event_type === 'office_hours';
      // Extract coach name from description for office hours, or from title if format is "Office Hours - CoachName"
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
        endTime: event.end_time, // Store end time for office hours
        location: event.location_name,
        eventType: event.event_type,
        coach: coachName, // Store coach name for office hours
        original: event
      });
    });
    
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [meets, practices, events, generateScheduledSlots]);

  // Filter items for calendar display (exclude scheduled_practice - those go in Workout Planner)
  const calendarItems = useMemo(() => {
    return allItems.filter(item => item.type !== 'scheduled_practice');
  }, [allItems]);

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return calendarItems;
    // Handle plural filter names
    const filterType = activeFilter === 'office_hours' ? 'office_hours' : activeFilter.replace(/s$/, '');
    return calendarItems.filter(item => item.type === filterType);
  }, [calendarItems, activeFilter]);

  // Get items for a specific date
  const getItemsForDate = (date) => {
    return filteredItems.filter(item => {
      if (item.date === date) return true;
      // Check if date falls within multi-day events
      if (item.endDate && date > item.date && date <= item.endDate) return true;
      return false;
    });
  };

  // Navigation handlers
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

  // Handle item click
  const handleItemClick = (item) => {
    switch (item.type) {
      case 'meet':
        onViewMeet?.(item.original);
        break;
      case 'practice':
        onViewPractice?.(item.original.id);
        break;
      case 'scheduled_practice':
        // If there's already a workout, open it for editing
        if (item.hasWorkout && item.linkedPracticeId) {
          onViewPractice?.(item.linkedPracticeId);
        } else {
          // Otherwise, create a new practice with pre-filled data
          onCreatePracticeFromSchedule?.({
            groupName: item.groupName,
            activityType: item.activityType,
            date: item.date,
            startTime: item.time,
            endTime: item.endTime,
            location: item.location,
            scheduleId: item.scheduleId
          });
        }
        break;
      case 'event':
        onViewEvent?.(item.original);
        break;
    }
  };

  // Render schedule item
  const ScheduleItem = ({ item, compact = false, showDate = false }) => {
    const colors = TYPE_COLORS[item.type] || TYPE_COLORS.event;
    const Icon = colors.icon;
    const isOfficeHours = item.type === 'office_hours';
    const isScheduledPractice = item.type === 'scheduled_practice';
    
    // Get activity label for scheduled practices
    const getActivityLabel = (activityType) => {
      const labels = {
        'swim': 'Swim',
        'dryland': 'Dryland',
        'doubles_am': 'AM Swim',
        'doubles_pm': 'PM Swim',
        'am_swim': 'AM Swim',
        'pm_swim': 'PM Swim'
      };
      return labels[activityType] || 'Practice';
    };
    
    if (compact) {
      // Scheduled practice compact view
      if (isScheduledPractice) {
        return (
          <div
            onClick={() => handleItemClick(item)}
            className={`${item.hasWorkout ? 'bg-sky-100 border-sky-300' : 'bg-slate-50 border-slate-200 border-dashed'} border rounded-lg px-2 py-1 cursor-pointer hover:bg-sky-100 transition-all`}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${item.hasWorkout ? 'bg-sky-500' : 'bg-slate-300'} flex-shrink-0`} />
              <span className={`text-xs font-medium ${item.hasWorkout ? 'text-sky-700' : 'text-slate-500'} truncate`}>
                {item.groupName}
              </span>
              {item.hasWorkout && item.yards && (
                <span className="text-[10px] bg-sky-500 text-white px-1 py-0.5 rounded font-bold ml-auto flex-shrink-0">
                  {(item.yards / 1000).toFixed(1)}k
                </span>
              )}
              {!item.hasWorkout && (
                <Plus size={10} className="text-slate-400 ml-auto flex-shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {getActivityLabel(item.activityType)} • {formatTimeOfDay(item.time)}
              {item.endTime && ` - ${formatTimeOfDay(item.endTime)}`}
            </div>
          </div>
        );
      }
      
      return (
        <div
          onClick={() => handleItemClick(item)}
          className={`${colors.bg} ${colors.border} border rounded-lg px-2 py-1 cursor-pointer ${colors.bgHover} transition-all truncate`}
        >
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
            <span className={`text-xs font-medium ${colors.text} truncate`}>
              {isOfficeHours ? `Office Hours` : item.title}
            </span>
            {isOfficeHours && item.coach && (
              <span className="text-xs bg-teal-500 text-white px-1.5 py-0.5 rounded font-medium ml-auto flex-shrink-0">
                {item.coach}
              </span>
            )}
          </div>
        </div>
      );
    }
    
    // Scheduled practice full view
    if (isScheduledPractice) {
      return (
        <div
          onClick={() => handleItemClick(item)}
          className={`${item.hasWorkout ? 'bg-sky-50 border-l-sky-500' : 'bg-slate-50 border-l-slate-300 border-dashed'} border-l-4 rounded-lg p-4 cursor-pointer hover:bg-sky-100 transition-all shadow-sm hover:shadow-md`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${item.hasWorkout ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
              <Waves size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wide ${item.hasWorkout ? 'text-sky-600' : 'text-slate-400'}`}>
                  {getActivityLabel(item.activityType)}
                </span>
                {item.hasWorkout ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <Check size={10} /> Workout Ready
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                    <Plus size={10} /> Add Workout
                  </span>
                )}
                {item.isModified && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Modified
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-800 truncate">
                {item.groupName}
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                {showDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatDateSafe(item.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatTimeOfDay(item.time)}
                  {item.endTime && ` - ${formatTimeOfDay(item.endTime)}`}
                </span>
                {item.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {item.location}
                  </span>
                )}
                {item.hasWorkout && item.yards && (
                  <span className="font-bold text-sky-600">{item.yards.toLocaleString()}y</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div
        onClick={() => handleItemClick(item)}
        className={`${colors.bg} border-l-4 ${colors.borderAccent} rounded-lg p-4 cursor-pointer ${colors.bgHover} transition-all shadow-sm hover:shadow-md`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white/70 ${colors.text}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold ${colors.text} uppercase tracking-wide`}>{colors.label}</span>
              {item.status && !isOfficeHours && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  item.status === 'open' ? 'bg-green-100 text-green-700' : 
                  item.status === 'completed' ? 'bg-slate-100 text-slate-600' : 
                  'bg-slate-100 text-slate-600'
                }`}>
                  {item.status}
                </span>
              )}
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
              {showDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {formatDateSafe(item.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
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
              {item.yards && (
                <span className="font-bold text-sky-600">{item.yards.toLocaleString()}y</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Week calendar data
  const weekDays = getWeekDates(currentDate);
  
  // Month calendar data
  const monthDays = getMonthCalendar(currentDate.getFullYear(), currentDate.getMonth());

  // Group agenda items by date
  const agendaGroups = useMemo(() => {
    const groups = {};
    const today = new Date().toISOString().split('T')[0];
    
    filteredItems
      .filter(item => item.date >= today)
      .forEach(item => {
        if (!groups[item.date]) {
          groups[item.date] = [];
        }
        groups[item.date].push(item);
      });
    
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 15); // Limit to 15 groups
  }, [filteredItems]);

  // Get date range display
  const getDateRangeDisplay = () => {
    if (viewMode === 'agenda') {
      return 'Upcoming';
    } else if (viewMode === 'week') {
      const startMonth = MONTHS[parseDateSafe(weekDays[0].date).getMonth()];
      const endMonth = MONTHS[parseDateSafe(weekDays[6].date).getMonth()];
      const year = parseDateSafe(weekDays[0].date).getFullYear();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${weekDays[0].dayNum} - ${weekDays[6].dayNum}, ${year}`;
      }
      return `${startMonth} ${weekDays[0].dayNum} - ${endMonth} ${weekDays[6].dayNum}, ${year}`;
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  // Upcoming items for sidebar
  const upcomingItems = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredItems
      .filter(item => item.date >= today)
      .slice(0, 5);
  }, [filteredItems]);

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Schedule</h2>
          <p className="text-slate-500 text-sm md:text-base">
            {mainView === 'workouts' ? 'Create workouts for scheduled practices' : 'Manage meets, practices, and team events'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Main View Toggle */}
          <div className="bg-slate-100 rounded-xl p-1 flex">
            <button
              onClick={() => setMainView('workouts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mainView === 'workouts' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList size={16} />
              <span>Workouts</span>
            </button>
            <button
              onClick={() => setMainView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mainView === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar size={16} />
              <span>Calendar</span>
            </button>
          </div>
          
          {/* Calendar View Mode Toggle - Only show in calendar mode */}
          {mainView === 'calendar' && (
            <div className="bg-slate-100 rounded-xl p-1 flex">
              <button
                onClick={() => setViewMode('week')}
                className={`p-2 md:px-3 md:py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Week View"
              >
                <CalendarDays size={18} className="md:hidden" />
                <span className="hidden md:inline">Week</span>
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`p-2 md:px-3 md:py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Month View"
              >
                <LayoutGrid size={18} className="md:hidden" />
                <span className="hidden md:inline">Month</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`p-2 md:px-3 md:py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'agenda' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Agenda View"
              >
                <LayoutList size={18} className="md:hidden" />
                <span className="hidden md:inline">Agenda</span>
              </button>
            </div>
          )}
          
          {/* Create Button */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create</span>
              <ChevronDown size={16} className="hidden sm:inline" />
            </button>
            
            {showCreateMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCreateMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Add</div>
                  <button
                    onClick={() => { setShowCreateMenu(false); setQuickCreateType('meet'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-100">
                      <Trophy size={16} className="text-amber-600" />
                    </div>
                    <span className="font-medium text-slate-700">New Meet</span>
                  </button>
                  <button
                    onClick={() => { setShowCreateMenu(false); setQuickCreateType('practice'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-sky-100">
                      <Waves size={16} className="text-sky-600" />
                    </div>
                    <span className="font-medium text-slate-700">New Practice</span>
                  </button>
                  <button
                    onClick={() => { setShowCreateMenu(false); setQuickCreateType('office_hours'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-teal-100">
                      <UserCircle size={16} className="text-teal-600" />
                    </div>
                    <span className="font-medium text-slate-700">Office Hours</span>
                  </button>
                  <button
                    onClick={() => { setShowCreateMenu(false); setQuickCreateType('event'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-violet-100">
                      <Heart size={16} className="text-violet-600" />
                    </div>
                    <span className="font-medium text-slate-700">New Event</span>
                  </button>
                  
                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Editor</div>
                    <button
                      onClick={() => { setShowCreateMenu(false); onCreateMeet?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <span className="text-slate-500">Open Meet Manager</span>
                    </button>
                    <button
                      onClick={() => { setShowCreateMenu(false); onCreatePractice?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <span className="text-slate-500">Open Practice Builder</span>
                    </button>
                    <button
                      onClick={() => { setShowCreateMenu(false); onManagePracticeSchedule?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <span className="text-slate-500">⚡ Manage Practice Times</span>
                    </button>
                    <button
                      onClick={() => { setShowCreateMenu(false); onCreateEvent?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <span className="text-slate-500">Open Event Manager</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Workout Planner View */}
      {mainView === 'workouts' && (
        <WorkoutPlanner
          onCreatePractice={onCreatePracticeFromSchedule}
          onViewPractice={onViewPractice}
        />
      )}

      {/* Calendar View */}
      {mainView === 'calendar' && (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {FILTERS.map(filter => {
              const Icon = filter.icon;
              // Handle office_hours specially since it doesn't follow singular/plural pattern
              const filterType = filter.id === 'office_hours' ? 'office_hours' : filter.id.replace(/s$/, '');
              // Count from calendarItems (excludes scheduled_practice)
              const count = filter.id === 'all' 
                ? calendarItems.length 
                : calendarItems.filter(i => i.type === filterType).length;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeFilter === filter.id
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  {filter.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeFilter === filter.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Calendar Header */}
          {viewMode !== 'agenda' && (
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={handlePrev}
                className="p-2.5 hover:bg-white rounded-xl text-slate-600 transition-colors shadow-sm border border-slate-200"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {getDateRangeDisplay()}
                </h3>
                <button
                  onClick={handleToday}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                >
                  Today
                </button>
              </div>
              <button
                onClick={handleNext}
                className="p-2.5 hover:bg-white rounded-xl text-slate-600 transition-colors shadow-sm border border-slate-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={32} />
              <p className="text-slate-400">Loading schedule...</p>
            </div>
          ) : viewMode === 'agenda' ? (
            /* Agenda View */
            <div className="p-4 md:p-6 space-y-6 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">{getDateRangeDisplay()}</h3>
                <span className="text-sm text-slate-500">{filteredItems.filter(i => i.date >= new Date().toISOString().split('T')[0]).length} upcoming</span>
              </div>
              
              {agendaGroups.length > 0 ? (
                agendaGroups.map(([date, items]) => {
                  const dateObj = parseDateSafe(date);
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const isTomorrow = date === tomorrow.toISOString().split('T')[0];
                  
                  return (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                          isToday ? 'bg-blue-600 text-white' : 'bg-slate-100'
                        }`}>
                          <span className={`text-xs font-bold uppercase ${isToday ? 'text-blue-100' : 'text-slate-500'}`}>
                            {DAYS[dateObj.getDay()]}
                          </span>
                          <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-slate-800'}`}>
                            {dateObj.getDate()}
                          </span>
                        </div>
                        <div>
                          <div className={`font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : DAYS_FULL[dateObj.getDay()]}
                          </div>
                          <div className="text-sm text-slate-500">
                            {MONTHS[dateObj.getMonth()]} {dateObj.getDate()}, {dateObj.getFullYear()}
                          </div>
                        </div>
                      </div>
                      <div className="ml-15 space-y-2 pl-4 border-l-2 border-slate-100">
                        {items.map(item => (
                          <ScheduleItem key={`${item.type}-${item.id}`} item={item} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No upcoming events</p>
                  <p className="text-sm">Create a meet, practice, or event to get started</p>
                </div>
              )}
            </div>
          ) : viewMode === 'week' ? (
            /* Week View */
            <div 
              ref={containerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="grid grid-cols-7 divide-x divide-slate-100"
            >
              {weekDays.map((day) => {
                const dayItems = getItemsForDate(day.date);
                
                return (
                  <div key={day.date} className="min-h-[350px] md:min-h-[400px]">
                    {/* Day Header */}
                    <div className={`p-2 md:p-3 text-center border-b ${
                      day.isToday ? 'bg-blue-50 border-blue-100' : day.isWeekend ? 'bg-slate-50' : 'bg-white'
                    }`}>
                      <div className="text-[10px] md:text-xs font-bold text-slate-500">{day.dayName}</div>
                      <div className={`text-lg md:text-xl font-bold ${
                        day.isToday ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto' : 'text-slate-900'
                      }`}>
                        {day.dayNum}
                      </div>
                    </div>
                    
                    {/* Day Content */}
                    <div className="p-1.5 md:p-2 space-y-1 md:space-y-1.5">
                      {dayItems.length > 0 ? (
                        <>
                          {dayItems.slice(0, 4).map(item => (
                            <ScheduleItem key={`${item.type}-${item.id}`} item={item} compact />
                          ))}
                          {dayItems.length > 4 && (
                            <div className="text-[10px] text-slate-400 font-medium text-center py-1">
                              +{dayItems.length - 4} more
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-200 text-center py-6 text-xs">—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Month View */
            <div>
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {DAYS.map(day => (
                  <div key={day} className="p-2 text-center text-xs font-bold text-slate-500 bg-slate-50">
                    <span className="hidden md:inline">{day}</span>
                    <span className="md:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {monthDays.map((day, index) => {
                  const dayItems = getItemsForDate(day.date);
                  
                  return (
                    <div 
                      key={index}
                      className={`min-h-[80px] md:min-h-[100px] p-1 ${
                        !day.isCurrentMonth ? 'bg-slate-50/50' : ''
                      } ${day.isToday ? 'bg-blue-50' : ''}`}
                    >
                      <div className={`text-xs font-bold mb-1 ${
                        day.isToday 
                          ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center' 
                          : day.isCurrentMonth 
                            ? 'text-slate-900' 
                            : 'text-slate-300'
                      }`}>
                        {day.dayNum}
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 2).map(item => (
                          <ScheduleItem key={`${item.type}-${item.id}`} item={item} compact />
                        ))}
                        {dayItems.length > 2 && (
                          <div className="text-[10px] text-slate-400 font-medium px-1">
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
        </div>

        {/* Sidebar - Upcoming */}
        <div className="lg:w-80 hidden lg:block">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-blue-600" />
              Up Next
            </h3>
            
            {upcomingItems.length > 0 ? (
              <div className="space-y-3">
                {upcomingItems.map(item => (
                  <ScheduleItem key={`${item.type}-${item.id}`} item={item} showDate />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                No upcoming items
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <Trophy size={20} className="mx-auto text-amber-500 mb-1" />
              <div className="text-2xl font-bold text-amber-700">{meets.length}</div>
              <div className="text-xs text-amber-600 font-medium">Meets</div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
              <Waves size={20} className="mx-auto text-sky-500 mb-1" />
              <div className="text-2xl font-bold text-sky-700">{practices.length}</div>
              <div className="text-xs text-sky-600 font-medium">Practices</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
              <Heart size={20} className="mx-auto text-violet-500 mb-1" />
              <div className="text-2xl font-bold text-violet-700">{events.length}</div>
              <div className="text-xs text-violet-600 font-medium">Events</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick Stats */}
          <div className="lg:hidden grid grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <Trophy size={18} className="mx-auto text-amber-500 mb-1" />
              <div className="text-xl font-bold text-amber-700">{meets.length}</div>
              <div className="text-xs text-amber-600">Meets</div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
              <Waves size={18} className="mx-auto text-sky-500 mb-1" />
              <div className="text-xl font-bold text-sky-700">{practices.length}</div>
              <div className="text-xs text-sky-600">Practices</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
              <Heart size={18} className="mx-auto text-violet-500 mb-1" />
              <div className="text-xl font-bold text-violet-700">{events.length}</div>
              <div className="text-xs text-violet-600">Events</div>
            </div>
          </div>
        </>
      )}

      {/* Quick Create Modal */}
      <QuickCreateModal
        isOpen={!!quickCreateType}
        type={quickCreateType || 'event'}
        onClose={() => setQuickCreateType(null)}
        onSubmit={handleQuickCreate}
        loading={quickCreateLoading}
      />
      
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
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
