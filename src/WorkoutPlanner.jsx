// src/WorkoutPlanner.jsx
// Clean grid-based view for coaches to create workouts for scheduled practices
// Designed to be easily filterable by coach assignment in the future

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  ChevronLeft, ChevronRight, Check, Plus, Minus, Calendar,
  Loader2, Waves, Dumbbell, Sun, Moon, Clock, AlertCircle,
  RefreshCw, Filter, User
} from 'lucide-react';
import { formatTimeOfDay } from './utils/dateUtils';
import CoachAssignmentPicker from './components/CoachAssignmentPicker';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ACTIVITY_ICONS = {
  swim: Waves,
  dryland: Dumbbell,
  doubles_am: Sun,
  doubles_pm: Moon,
  am_swim: Sun,
  pm_swim: Moon
};

const ACTIVITY_COLORS = {
  swim: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600', dot: 'bg-sky-500' },
  dryland: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-500' },
  doubles_am: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', dot: 'bg-orange-500' },
  doubles_pm: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', dot: 'bg-indigo-500' },
  am_swim: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', dot: 'bg-orange-500' },
  pm_swim: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', dot: 'bg-indigo-500' }
};

// Get the start of the week (Sunday) for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get array of dates for the week
function getWeekDates(weekStart) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Practice Cell Component
function PracticeCell({ 
  schedule, 
  date, 
  practice, 
  exception, 
  onClick, 
  isToday,
  assignedCoaches = [],
  onAssignCoaches
}) {
  const isCanceled = exception?.exception_type === 'canceled';
  const isModified = exception?.exception_type === 'modified';
  const hasWorkout = !!practice;
  
  const activityColors = ACTIVITY_COLORS[schedule.activity_type] || ACTIVITY_COLORS.swim;
  const Icon = ACTIVITY_ICONS[schedule.activity_type] || Waves;
  
  if (isCanceled) {
    return (
      <div className="h-full flex items-center justify-center p-2">
        <div className="text-center text-slate-300">
          <Minus size={16} className="mx-auto mb-1" />
          <span className="text-[10px]">Canceled</span>
        </div>
      </div>
    );
  }
  
  const time = isModified && exception.new_start_time 
    ? exception.new_start_time 
    : schedule.start_time;
  
  const endTime = isModified && exception.new_end_time
    ? exception.new_end_time
    : schedule.end_time;
  
  return (
    <div
      className={`w-full h-full p-2 rounded-xl transition-all relative ${
        hasWorkout 
          ? `${activityColors.bg} ${activityColors.border} border-2 hover:shadow-md`
          : 'bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100'
      } ${isToday ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
    >
      {/* Coach Assign Button - Top Left */}
      {onAssignCoaches && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAssignCoaches();
          }}
          className="absolute top-1 left-1 p-1 rounded hover:bg-white/70 transition-colors z-10"
          title="Assign coaches"
        >
          <User size={14} className="text-slate-400 hover:text-blue-500" />
        </button>
      )}
      
      {/* Add Workout Button - Top Right */}
      {!hasWorkout && (
        <button
          onClick={onClick}
          className="absolute top-1 right-1 p-1 rounded hover:bg-white/70 transition-colors z-10"
          title="Add workout"
        >
          <Plus size={14} className="text-slate-400 hover:text-blue-500" />
        </button>
      )}
      
      <button
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center gap-1"
      >
        {hasWorkout ? (
          <>
            <span className="text-xs font-bold text-slate-700">
              {practice.total_yards ? `${(practice.total_yards / 1000).toFixed(1)}k` : 'Ready'}
            </span>
            <span className="text-[10px] text-slate-500">
              {formatTimeOfDay(time)}
              {endTime && ` - ${formatTimeOfDay(endTime)}`}
            </span>
            
            {/* Assigned Coaches */}
            {assignedCoaches.length > 0 && (
              <div className="flex items-center gap-0.5 mt-1">
                {assignedCoaches.slice(0, 2).map((coach, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 rounded-full bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center"
                    title={coach.name}
                  >
                    {coach.initials || coach.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                ))}
                {assignedCoaches.length > 2 && (
                  <div className="w-5 h-5 rounded-full bg-slate-400 text-white text-[8px] font-bold flex items-center justify-center">
                    +{assignedCoaches.length - 2}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-xs text-slate-400 font-medium">Add Workout</span>
            <span className="text-[10px] text-slate-400">
              {formatTimeOfDay(time)}
              {endTime && ` - ${formatTimeOfDay(endTime)}`}
            </span>
            
            {/* Assigned Coaches (even without workout) */}
            {assignedCoaches.length > 0 && (
              <div className="flex items-center gap-0.5 mt-1">
                {assignedCoaches.slice(0, 2).map((coach, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 rounded-full bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center"
                    title={coach.name}
                  >
                    {coach.initials || coach.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                ))}
                {assignedCoaches.length > 2 && (
                  <div className="w-5 h-5 rounded-full bg-slate-400 text-white text-[8px] font-bold flex items-center justify-center">
                    +{assignedCoaches.length - 2}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {isModified && (
          <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full">
            Modified
          </span>
        )}
      </button>
    </div>
  );
}

// Empty Cell (no practice scheduled for this group/day)
function EmptyCell() {
  return (
    <div className="h-full flex items-center justify-center text-slate-200">
      <span className="text-lg">—</span>
    </div>
  );
}

// Group Row Component
function GroupRow({ 
  groupName, 
  schedules, 
  weekDates, 
  practices, 
  exceptions, 
  onCellClick,
  today,
  practiceCoaches,
  setShowCoachPicker,
  filterCoach
}) {
  // Get unique activity types for this group
  const activityTypes = [...new Set(schedules.map(s => s.activity_type))];
  
  return (
    <>
      {activityTypes.map((activityType, actIdx) => {
        const Icon = ACTIVITY_ICONS[activityType] || Waves;
        const colors = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.swim;
        
        const activitySchedules = schedules.filter(s => s.activity_type === activityType);
        
        return (
          <tr key={`${groupName}-${activityType}`} className={actIdx > 0 ? 'border-t border-slate-100' : ''}>
            {/* Group/Activity Label */}
            <td className="sticky left-0 bg-white z-10 p-3 border-r border-slate-200">
              <div className="flex items-center gap-2 min-w-[140px]">
                <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                  <Icon size={14} className={colors.text} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{groupName}</div>
                  <div className={`text-xs ${colors.text} capitalize`}>
                    {activityType.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </td>
            
            {/* Day Cells */}
            {weekDates.map((date, dayIdx) => {
              const dayOfWeek = new Date(date + 'T00:00:00').getDay();
              const schedule = activitySchedules.find(s => s.day_of_week === dayOfWeek);
              const isToday = date === today;
              
              if (!schedule) {
                return (
                  <td key={date} className={`p-2 ${dayIdx === 0 || dayIdx === 6 ? 'bg-slate-50/50' : ''}`}>
                    <EmptyCell />
                  </td>
                );
              }
              
              // Check for exception
              const exception = exceptions.find(e => 
                e.exception_date === date && 
                (e.group_name === null || e.group_name === groupName) &&
                (e.activity_type === null || e.activity_type === activityType)
              );
              
              // Find matching practice
              const practice = practices.find(p => 
                p.scheduled_date === date &&
                p.scheduled_time === schedule.start_time &&
                (p.training_group_id === groupName || p.title?.includes(groupName))
              );
              
              // If filtering by coach, check if this practice/slot is relevant to them
              if (filterCoach !== 'all') {
                if (practice) {
                  // For practices with workouts, check if coach is assigned to the practice
                  const coaches = practiceCoaches[practice.id] || [];
                  const isAssignedToCoach = coaches.some(c => c.id === filterCoach);
                  
                  // If practice exists but coach isn't assigned, show empty cell
                  if (!isAssignedToCoach) {
                    return (
                      <td key={date} className={`p-2 ${dayIdx === 0 || dayIdx === 6 ? 'bg-slate-50/50' : ''}`}>
                        <EmptyCell />
                      </td>
                    );
                  }
                }
                // For empty slots (no practice yet), they're already filtered by group in filteredGroups
              }
              
              return (
                <td key={date} className={`p-2 ${dayIdx === 0 || dayIdx === 6 ? 'bg-slate-50/50' : ''}`}>
                  <PracticeCell
                    schedule={schedule}
                    date={date}
                    practice={practice}
                    exception={exception}
                    isToday={isToday}
                    assignedCoaches={practice ? practiceCoaches[practice.id] || [] : []}
                    onAssignCoaches={() => practice && setShowCoachPicker(practice.id)}
                    onClick={() => onCellClick({
                      groupName,
                      activityType,
                      date,
                      startTime: schedule.start_time,
                      endTime: schedule.end_time,
                      location: schedule.location_name,
                      scheduleId: schedule.id,
                      existingPracticeId: practice?.id
                    })}
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

// Main Component
export default function WorkoutPlanner({ onCreatePractice, onViewPractice }) {
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [schedules, setSchedules] = useState([]);
  const [practices, setPractices] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Coach assignment filtering
  const [staffMembers, setStaffMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [filterCoach, setFilterCoach] = useState('all');
  
  // Practice coach assignments (for individual practices)
  const [practiceCoaches, setPracticeCoaches] = useState({});
  const [showCoachPicker, setShowCoachPicker] = useState(null); // practiceId
  
  const today = new Date().toISOString().split('T')[0];
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  
  useEffect(() => {
    loadData();
  }, [weekStart]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      
      // Load practice schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('practice_schedules')
        .select('*')
        .lte('season_start_date', endDate)
        .gte('season_end_date', startDate)
        .order('group_name')
        .order('start_time');
      
      if (schedulesError) {
        console.error('Error loading schedules:', schedulesError);
      }
      
      // Load practices for this week
      const { data: practicesData, error: practicesError } = await supabase
        .from('practices')
        .select('*')
        .eq('coach_id', user.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);
      
      if (practicesError) {
        console.error('Error loading practices:', practicesError);
      }
      
      // Load exceptions for this week
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('practice_schedule_exceptions')
        .select('*')
        .gte('exception_date', startDate)
        .lte('exception_date', endDate);
      
      if (exceptionsError) {
        console.error('Error loading exceptions:', exceptionsError);
      }
      
      setSchedules(schedulesData || []);
      setPractices(practicesData || []);
      setExceptions(exceptionsData || []);
      
      // Extract unique groups
      const uniqueGroups = [...new Set((schedulesData || []).map(s => s.group_name))];
      setGroups(uniqueGroups);
      
      // Load staff members for filter
      const { data: staffData } = await supabase
        .from('staff_members')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      setStaffMembers(staffData || []);
      
      // Load coach assignments
      const { data: assignmentsData } = await supabase
        .from('coach_group_assignments')
        .select('*')
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`);
      
      setAssignments(assignmentsData || []);
      
      // Load practice-specific coach assignments
      if (practicesData && practicesData.length > 0) {
        const practiceIds = practicesData.map(p => p.id);
        const { data: practiceCoachData } = await supabase
          .from('practice_coaches')
          .select('*, staff_members(*)')
          .in('practice_id', practiceIds);
        
        // Group by practice_id
        const coachesByPractice = {};
        (practiceCoachData || []).forEach(pc => {
          if (!coachesByPractice[pc.practice_id]) {
            coachesByPractice[pc.practice_id] = [];
          }
          coachesByPractice[pc.practice_id].push({
            ...pc.staff_members,
            assignment_id: pc.id,
            is_lead: pc.is_lead
          });
        });
        setPracticeCoaches(coachesByPractice);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter groups by selected coach
  const filteredGroups = useMemo(() => {
    if (filterCoach === 'all') return groups;
    
    // Get groups assigned to this coach via group assignments
    const assignedGroups = assignments
      .filter(a => a.coach_id === filterCoach)
      .map(a => a.group_name);
    
    // Also get groups that have practices assigned to this coach
    const practicesForCoach = practices.filter(p => {
      const coaches = practiceCoaches[p.id] || [];
      return coaches.some(c => c.id === filterCoach);
    });
    
    // Get unique group names from practices
    const groupsWithPractices = [...new Set(
      practicesForCoach
        .map(p => p.training_group_id || p.title)
        .filter(Boolean)
    )];
    
    // Combine both sources and get unique groups
    const allAssignedGroups = [...new Set([...assignedGroups, ...groupsWithPractices])];
    
    return groups.filter(g => allAssignedGroups.includes(g));
  }, [groups, assignments, filterCoach, practices, practiceCoaches]);

  // Calculate progress stats
  const stats = useMemo(() => {
    let totalSlots = 0;
    let filledSlots = 0;
    
    filteredGroups.forEach(groupName => {
      const groupSchedules = schedules.filter(s => s.group_name === groupName);
      
      weekDates.forEach(date => {
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        
        groupSchedules.forEach(schedule => {
          if (schedule.day_of_week !== dayOfWeek) return;
          
          // Check if canceled
          const exception = exceptions.find(e => 
            e.exception_date === date && 
            e.exception_type === 'canceled' &&
            (e.group_name === null || e.group_name === groupName)
          );
          
          if (exception) return;
          
          totalSlots++;
          
          // Check if has practice
          const practice = practices.find(p => 
            p.scheduled_date === date &&
            p.scheduled_time === schedule.start_time &&
            (p.training_group_id === groupName || p.title?.includes(groupName))
          );
          
          if (practice) filledSlots++;
        });
      });
    });
    
    return { total: totalSlots, filled: filledSlots };
  }, [filteredGroups, schedules, practices, exceptions, weekDates]);
  
  // Navigation
  const goToPrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };
  
  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };
  
  const goToThisWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };
  
  // Handle cell click
  const handleCellClick = (cellData) => {
    if (cellData.existingPracticeId) {
      // Edit existing practice
      onViewPractice?.(cellData.existingPracticeId);
    } else {
      // Create new practice
      onCreatePractice?.({
        groupName: cellData.groupName,
        activityType: cellData.activityType,
        date: cellData.date,
        startTime: cellData.startTime,
        endTime: cellData.endTime,
        location: cellData.location,
        scheduleId: cellData.scheduleId
      });
    }
  };
  
  // Week label
  const weekLabel = useMemo(() => {
    const start = new Date(weekDates[0] + 'T00:00:00');
    const end = new Date(weekDates[6] + 'T00:00:00');
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }, [weekDates]);
  
  // Check if showing current week
  const isCurrentWeek = useMemo(() => {
    const currentWeekStart = getWeekStart(new Date());
    return weekStart.getTime() === currentWeekStart.getTime();
  }, [weekStart]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }
  
  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">No Practice Schedule Set Up</h3>
        <p className="text-slate-500 mb-4">
          Set up your practice times first, then come back here to create workouts.
        </p>
      </div>
    );
  }

  if (filteredGroups.length === 0 && filterCoach !== 'all') {
    return (
      <div className="space-y-4">
        {/* Header with coach filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Workout Planner</h2>
            <p className="text-slate-500 text-sm">Click any cell to create or edit a workout</p>
          </div>
          
          {staffMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterCoach}
                onChange={(e) => setFilterCoach(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="all">All Coaches</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}'s Groups</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <User size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Groups Assigned</h3>
          <p className="text-slate-500 mb-4">
            This coach doesn't have any groups assigned yet.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Workout Planner</h2>
          <p className="text-slate-500 text-sm">Click any cell to create or edit a workout</p>
        </div>
        
        {/* Coach Filter + Progress */}
        <div className="flex items-center gap-4">
          {/* Coach Filter */}
          {staffMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterCoach}
                onChange={(e) => setFilterCoach(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">All Coaches</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}'s Groups</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">
              {stats.filled}/{stats.total}
            </div>
            <div className="text-xs text-slate-500">workouts ready</div>
          </div>
          <div className="w-32 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.filled / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3">
        <button
          onClick={goToPrevWeek}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800">{weekLabel}</h3>
          {!isCurrentWeek && (
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
            >
              This Week
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw size={16} className="text-slate-400" />
          </button>
        </div>
        
        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      </div>
      
      {/* Future: Coach Filter */}
      {/* 
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-slate-400" />
        <select className="text-sm border rounded-lg px-3 py-1.5">
          <option value="">All Coaches</option>
          <option value="joe">Joe's Practices</option>
          <option value="jack">Jack's Practices</option>
        </select>
      </div>
      */}
      
      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 z-10 p-3 text-left font-semibold text-slate-600 border-r border-slate-200 min-w-[160px]">
                  Group
                </th>
                {weekDates.map((date, idx) => {
                  const dayDate = new Date(date + 'T00:00:00');
                  const isToday = date === today;
                  const isWeekend = idx === 0 || idx === 6;
                  
                  return (
                    <th 
                      key={date} 
                      className={`p-3 text-center min-w-[100px] ${isWeekend ? 'bg-slate-100/50' : ''}`}
                    >
                      <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                        {DAYS[idx]}
                      </div>
                      <div className={`text-lg font-bold ${
                        isToday 
                          ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto' 
                          : 'text-slate-800'
                      }`}>
                        {dayDate.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGroups.map(groupName => (
                <GroupRow
                  key={groupName}
                  groupName={groupName}
                  schedules={schedules.filter(s => s.group_name === groupName)}
                  weekDates={weekDates}
                  practices={practices}
                  exceptions={exceptions}
                  onCellClick={handleCellClick}
                  today={today}
                  practiceCoaches={practiceCoaches}
                  setShowCoachPicker={setShowCoachPicker}
                  filterCoach={filterCoach}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-50 border-2 border-sky-200 flex items-center justify-center">
            <Check size={12} className="text-green-600" />
          </div>
          <span>Workout Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
            <Plus size={12} className="text-slate-400" />
          </div>
          <span>Needs Workout</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-300 text-lg">—</span>
          <span>No Practice</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
            <Minus size={12} className="text-slate-300" />
          </div>
          <span>Canceled</span>
        </div>
      </div>
      
      {/* Coach Assignment Picker Modal */}
      {showCoachPicker && (
        <CoachAssignmentPicker
          practiceId={showCoachPicker}
          currentCoaches={practiceCoaches[showCoachPicker] || []}
          onClose={() => setShowCoachPicker(null)}
          onUpdate={(updatedCoaches) => {
            setPracticeCoaches(prev => ({
              ...prev,
              [showCoachPicker]: updatedCoaches
            }));
          }}
        />
      )}
    </div>
  );
}

