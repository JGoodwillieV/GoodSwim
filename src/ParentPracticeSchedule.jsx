// src/ParentPracticeSchedule.jsx
// Weekly practice schedule card for parents
// Shows practice times filtered to their swimmer's group(s)

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  Calendar, Clock, Waves, Dumbbell, Sun, Moon,
  AlertCircle, ChevronLeft, ChevronRight, Loader2,
  CalendarOff, MapPin, Info
} from 'lucide-react';
import { formatTimeOfDay } from './utils/dateUtils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ACTIVITY_ICONS = {
  swim: { icon: Waves, color: 'blue', label: 'Swim' },
  dryland: { icon: Dumbbell, color: 'amber', label: 'Dryland' },
  doubles_am: { icon: Sun, color: 'orange', label: 'AM Swim' },
  doubles_pm: { icon: Moon, color: 'indigo', label: 'PM Swim' }
};

// Extract short group name (e.g., "CAT 2 Early" -> "CAT 2 Early", "Tropical Storms" -> "Tropical Storms")
// Could also shorten: "CAT 2 Early" -> "Early", "CAT 2 Late" -> "Late" if parent group is known
function getShortGroupLabel(groupName) {
  if (!groupName) return '';
  // Return the full group name, but could be shortened in the future
  return groupName;
}

// Time Slot Display
function TimeSlot({ slot, exception }) {
  const activityInfo = ACTIVITY_ICONS[slot.activity_type] || ACTIVITY_ICONS.swim;
  const Icon = activityInfo.icon;
  const color = activityInfo.color;
  const groupLabel = getShortGroupLabel(slot.group_name);

  const isCanceled = exception?.exception_type === 'canceled';
  const isModified = exception?.exception_type === 'modified';

  if (isCanceled) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
        <CalendarOff size={14} className="text-red-500" />
        <div className="flex-1">
          <span className="text-sm text-red-600 line-through">
            {formatTimeOfDay(slot.start_time)} - {formatTimeOfDay(slot.end_time)}
          </span>
          {groupLabel && (
            <span className="text-xs text-red-400 ml-2">({groupLabel})</span>
          )}
        </div>
        <span className="text-xs text-red-500">{exception.reason}</span>
      </div>
    );
  }

  const startTime = isModified && exception.new_start_time ? exception.new_start_time : slot.start_time;
  const endTime = isModified && exception.new_end_time ? exception.new_end_time : slot.end_time;

  return (
    <div className={`flex items-center gap-2 p-2 bg-${color}-50 border border-${color}-200 rounded-lg`}>
      <Icon size={14} className={`text-${color}-600 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold text-${color}-800`}>
            {formatTimeOfDay(startTime)} - {formatTimeOfDay(endTime)}
          </span>
          {isModified && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-xs font-medium text-${color}-600`}>{activityInfo.label}</span>
          {groupLabel && (
            <>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">{groupLabel}</span>
            </>
          )}
          {slot.notes && (
            <>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{slot.notes}</span>
            </>
          )}
        </div>
      </div>
      {slot.location_name && (
        <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
          <MapPin size={12} />
          {slot.location_name}
        </div>
      )}
    </div>
  );
}

// Day Card
function DayCard({ date, dayName, isToday, slots, exceptions }) {
  const daySlots = slots.filter(s => s.day_of_week === date.getDay());
  
  // Get exceptions for this date
  const dateStr = date.toISOString().split('T')[0];
  const dayExceptions = exceptions.filter(e => e.exception_date === dateStr);

  // Check if entire day is canceled
  const fullDayCancellation = dayExceptions.find(e => 
    e.exception_type === 'canceled' && !e.group_name && !e.activity_type
  );

  if (fullDayCancellation) {
    return (
      <div className={`p-3 rounded-xl border-2 ${
        isToday ? 'border-red-300 bg-red-50' : 'border-red-200 bg-red-50/50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${isToday ? 'text-red-700' : 'text-red-600'}`}>
            {dayName}
          </span>
          {isToday && (
            <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium">
              Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-red-600">
          <CalendarOff size={16} />
          <span className="text-sm font-medium">No Practice</span>
        </div>
        <div className="text-xs text-red-500 mt-1">{fullDayCancellation.reason}</div>
      </div>
    );
  }

  if (daySlots.length === 0) {
    return (
      <div className={`p-3 rounded-xl border-2 ${
        isToday ? 'border-slate-300 bg-slate-100' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${isToday ? 'text-slate-700' : 'text-slate-500'}`}>
            {dayName}
          </span>
          {isToday && (
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
              Today
            </span>
          )}
        </div>
        <div className="text-sm text-slate-400 italic">No practice</div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl border-2 ${
      isToday ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
          {dayName}
        </span>
        {isToday && (
          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
            Today
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {daySlots.map((slot, idx) => {
          const exception = dayExceptions.find(e => 
            (e.group_name === null || e.group_name === slot.group_name) &&
            (e.activity_type === null || e.activity_type === slot.activity_type)
          );
          return (
            <TimeSlot key={idx} slot={slot} exception={exception} />
          );
        })}
      </div>
    </div>
  );
}

// Week Navigation
function WeekNavigator({ weekStart, onPrev, onNext, onToday }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="p-2 hover:bg-slate-100 rounded-lg transition"
      >
        <ChevronLeft size={20} className="text-slate-600" />
      </button>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-800">
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </span>
        <button
          onClick={onToday}
          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
        >
          Today
        </button>
      </div>
      <button
        onClick={onNext}
        className="p-2 hover:bg-slate-100 rounded-lg transition"
      >
        <ChevronRight size={20} className="text-slate-600" />
      </button>
    </div>
  );
}

// Main Component - Compact Card Version
export function PracticeScheduleCard({ swimmerGroups = [], className = '' }) {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    return start;
  });

  useEffect(() => {
    loadScheduleData();
  }, [swimmerGroups]);

  // Helper function to check if a schedule group matches any of the swimmer's groups
  // "CAT 2 Early" matches "CAT 2", "CAT 2 Late" matches "CAT 2", etc.
  const groupMatches = (scheduleGroup, swimmerGroup) => {
    if (!scheduleGroup || !swimmerGroup) return false;
    const schedLower = scheduleGroup.toLowerCase();
    const swimLower = swimmerGroup.toLowerCase();
    // Check if schedule group starts with swimmer's group
    // e.g., "CAT 2 Early" starts with "CAT 2"
    return schedLower.startsWith(swimLower) || 
           schedLower === swimLower ||
           // Also check if swimmer group starts with schedule group (for exact matches)
           swimLower.startsWith(schedLower);
  };

  const loadScheduleData = async () => {
    if (swimmerGroups.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Load ALL schedules for the current season, then filter by group match
      // This allows "CAT 2" swimmer to see "CAT 2 Early" and "CAT 2 Late" schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('practice_schedules')
        .select('*')
        .lte('season_start_date', today)
        .gte('season_end_date', today)
        .order('start_time', { ascending: true });

      if (schedulesError) {
        console.error('Error loading schedules:', schedulesError);
      } else {
        // Filter schedules to match swimmer's groups (flexible matching)
        const filteredSchedules = (schedulesData || []).filter(schedule => 
          swimmerGroups.some(swimmerGroup => groupMatches(schedule.group_name, swimmerGroup))
        );
        console.log('Swimmer groups:', swimmerGroups);
        console.log('All schedules:', schedulesData?.length || 0);
        console.log('Filtered schedules:', filteredSchedules.length);
        setSchedules(filteredSchedules);
      }

      // Load exceptions for the next 2 weeks
      const twoWeeksOut = new Date();
      twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('practice_schedule_exceptions')
        .select('*')
        .gte('exception_date', today)
        .lte('exception_date', twoWeeksOut.toISOString().split('T')[0]);

      if (exceptionsError) {
        console.error('Error loading exceptions:', exceptionsError);
      } else {
        // Filter exceptions by group match (or null = all groups)
        const filteredExceptions = (exceptionsData || []).filter(exc => 
          exc.group_name === null || 
          swimmerGroups.some(swimmerGroup => groupMatches(exc.group_name, swimmerGroup))
        );
        setExceptions(filteredExceptions);
      }

    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get week dates
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push({
        date,
        dayName: DAYS_SHORT[i],
        dayFull: DAYS[i],
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
    return dates;
  }, [weekStart]);

  // Navigation
  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    setWeekStart(start);
  };

  // Get unique group names from schedules
  const activeGroups = [...new Set(schedules.map(s => s.group_name))];

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-blue-500" size={24} />
        </div>
      </div>
    );
  }

  if (swimmerGroups.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
        <div className="text-center py-4 text-slate-500">
          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No swimmer assigned to a training group</p>
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Practice Schedule</h3>
            <p className="text-sm text-slate-500">{activeGroups.join(', ') || swimmerGroups.join(', ')}</p>
          </div>
        </div>
        <div className="text-center py-6 bg-slate-50 rounded-xl">
          <Info size={24} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600">Schedule not yet posted</p>
          <p className="text-xs text-slate-500 mt-1">Check back later for practice times</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-bold">Practice Schedule</h3>
            <p className="text-sm text-blue-100">{activeGroups.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="p-4 border-b border-slate-100">
        <WeekNavigator
          weekStart={weekStart}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
          onToday={handleToday}
        />
      </div>

      {/* Schedule Grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {weekDates.map((day, idx) => (
          <DayCard
            key={idx}
            date={day.date}
            dayName={day.dayName}
            isToday={day.isToday}
            slots={schedules}
            exceptions={exceptions}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
          {Object.entries(ACTIVITY_ICONS).map(([key, info]) => {
            const Icon = info.icon;
            const hasActivity = schedules.some(s => s.activity_type === key);
            if (!hasActivity) return null;
            return (
              <div key={key} className="flex items-center gap-1">
                <Icon size={12} className={`text-${info.color}-500`} />
                <span>{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Full Page Version (for dedicated schedule view)
export default function ParentPracticeSchedule({ swimmerGroups = [], onBack }) {
  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full pb-24 md:pb-8">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition"
        >
          <ChevronLeft size={20} />
          Back
        </button>
      )}
      
      <div className="max-w-4xl mx-auto">
        <PracticeScheduleCard swimmerGroups={swimmerGroups} />
        
        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">About Practice Schedules</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Times shown are the regular weekly schedule for your swimmer's group</li>
                <li>• Canceled or modified practices will be highlighted</li>
                <li>• Check announcements for any last-minute changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

